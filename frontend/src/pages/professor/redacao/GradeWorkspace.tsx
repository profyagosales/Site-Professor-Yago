import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { AnnotationToolbar } from '@/components/redacao/AnnotationToolbar';
import { PdfCorrectionViewer } from '@/components/redacao/PdfCorrectionViewer';
import { AnnotationSidebar } from '@/components/redacao/AnnotationSidebar';
import { CorrectionMirror, ANNUL_OPTIONS, type PasState, type PasFieldKey } from '@/components/redacao/CorrectionMirror';
import type { AnnotationItem, NormalizedRect } from '@/components/redacao/annotationTypes';
import { HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import { useAuth } from '@/components/AuthContext';
import { ENEM_2024 } from '@/features/essay/rubrics/enem2024';
import type { RubricGroup, RubricCriterion } from '@/features/essay/rubrics/enem2024';
import type { EnemSelectionsMap } from '@/components/essay/EnemScoringForm';
import {
  fetchEssayById,
  issueFileToken,
  peekEssayFile,
} from '@/services/essays.service';
import {
  getEssayAnnotations as fetchAnnotations,
  saveEssayAnnotations as persistAnnotations,
  getEssayScore,
  saveEssayScore,
} from '@/services/essays.service';
import { generateCorrectedPdf } from '@/features/redacao/pdf/generateCorrectedPdf';
import type { AnnotationKind, EssayPdfData, EssayModel } from '@/features/redacao/pdf/types';
import { renderFirstPageToPng } from '@/features/redacao/pdf/pdfPreview';



function createInitialEnemSelections(): EnemSelectionsMap {
  return ENEM_2024.reduce(
    (acc, competency) => {
      const defaultLevel = competency.levels[0]?.level ?? 0;
      acc[competency.key] = { level: defaultLevel, reasonIds: [] };
      return acc;
    },
    {} as EnemSelectionsMap
  );
}

function calculateEnemTotal(selections: EnemSelectionsMap) {
  return ENEM_2024.reduce((sum, competency) => {
    const selection = selections[competency.key];
    const levelData = competency.levels.find((level) => level.level === selection?.level);
    return sum + (levelData?.points ?? 0);
  }, 0);
}

function collectReasonIds(node: RubricGroup | RubricCriterion): string[] {
  if ('id' in node) return [node.id];
  return node.items.flatMap((child) => collectReasonIds(child));
}

function sanitizeEnemSelection(key: keyof EnemSelectionsMap, selection: { level: number; reasonIds: string[] }) {
  const competency = ENEM_2024.find((comp) => comp.key === key);
  if (!competency) return { level: selection.level, reasonIds: [] };
  const levelData =
    competency.levels.find((level) => level.level === selection.level) ?? competency.levels[0];
  const validReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
  const reasonIds = Array.isArray(selection.reasonIds)
    ? selection.reasonIds.filter((id) => validReasonIds.includes(id))
    : [];
  return { level: levelData.level, reasonIds };
}

function toInputValue(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return value.toString();
}

function normalizeAnnotations(apiAnnos: any[]): AnnotationItem[] {
  return apiAnnos
    .map((raw, index) => {
      const category = (raw?.category || 'argumentacao') as HighlightCategoryKey;
      const palette = HIGHLIGHT_CATEGORIES[category] ?? HIGHLIGHT_CATEGORIES.argumentacao;
      const rects = Array.isArray(raw?.rects) ? raw.rects : [];
      const normalizedRects: NormalizedRect[] = rects
        .filter((r: any) => typeof r?.x === 'number' && typeof r?.y === 'number')
        .map((r: any) => ({
          x: Number(r.x) || 0,
          y: Number(r.y) || 0,
          width: Number(r.w ?? r.width) || 0,
          height: Number(r.h ?? r.height) || 0,
        }));
      if (normalizedRects.length === 0) return null;
      return {
        id: String(raw._id || raw.id || nanoid()),
        page: Number(raw.page) || 1,
        rects: normalizedRects,
        category,
        comment: typeof raw.comment === 'string' ? raw.comment : '',
        color: palette.color,
        number: Number(raw.number) || index + 1,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      } satisfies AnnotationItem;
    })
    .filter(Boolean) as AnnotationItem[];
}

function renumber(list: AnnotationItem[]) {
  return list
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((item, idx) => ({ ...item, number: idx + 1 }));
}

const HIGHLIGHT_TO_KIND: Record<HighlightCategoryKey, AnnotationKind> = {
  argumentacao: 'argument',
  ortografia: 'grammar',
  coesao: 'cohesion',
  apresentacao: 'presentation',
  comentarios: 'general',
};


function getInitialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() ?? '')
    .join('');
}

function MirrorSummaryInline(props: {
  type: 'PAS' | 'ENEM' | null;
  pas: {
    nc: number;
    tl: number | null;
    ne: number;
    discount: number | null;
    nr: number | null;
  } | null;
  enemTotal: number;
}) {
  const { type, pas, enemTotal } = props;
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-orange-700">Resumo do espelho</h3>
      {type === 'PAS' && pas ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <span className="block text-[10px] text-slate-500">NC</span>
            <span className="text-base font-bold leading-none">{pas.nc.toFixed(2)}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <span className="block text-[10px] text-slate-500">NR previsto</span>
            <span className="text-base font-bold leading-none">{(pas.nr ?? 0).toFixed(2)}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <span className="block text-[10px] text-slate-500">TL</span>
            <span className="text-base font-semibold leading-none">{pas.tl ?? 0}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <span className="block text-[10px] text-slate-500">NE total</span>
            <span className="text-base font-semibold leading-none">{pas.ne}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <span className="block text-[10px] text-slate-500">TOTAL ENEM</span>
            <span className="text-base font-bold leading-none">{Math.max(0, Math.round(enemTotal))} / 1000</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Converte uma URL http(s) em data URI (base64). Mantém `data:` se já vier pronto.
async function toDataUriIfHttp(url?: string | null): Promise<string | undefined> {
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('data:')) return url;
  if (!/^https?:/i.test(url)) return undefined;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl || undefined;
  } catch {
    return undefined;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function GradeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [essay, setEssay] = useState<any | null>(null);
  const [loadingEssay, setLoadingEssay] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<HighlightCategoryKey>('argumentacao');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [focusAnnotationId, setFocusAnnotationId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [annulState, setAnnulState] = useState<Record<string, boolean>>({});
  const [annulOther, setAnnulOther] = useState('');
  const [brandSrc, setBrandSrc] = useState('/logo.svg');
  const createEmptyPasState = (): PasState => ({
    apresentacao: '',
    argumentacao: '',
    adequacao: '',
    coesao: '',
    TL: '',
    erros: {
      grafia: '',
      pontuacao: '',
      propriedade: '',
    },
  });
  const [pasState, setPasState] = useState<PasState>(() => createEmptyPasState());
  const [enemSelections, setEnemSelections] = useState<EnemSelectionsMap>(() => createInitialEnemSelections());

  const essayType = (essay?.type || essay?.model || null) as 'PAS' | 'ENEM' | null;
  const annulled = useMemo(
    () => Object.values(annulState).some(Boolean),
    [annulState]
  );

  const pasDerived = useMemo(() => {
    const parseMacro = (value: string, max: number) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return Math.min(Math.max(num, 0), max);
    };
    const macros = {
      apresentacao: parseMacro(pasState.apresentacao, 0.5),
      argumentacao: parseMacro(pasState.argumentacao, 4.5),
      adequacao: parseMacro(pasState.adequacao, 2),
      coesao: parseMacro(pasState.coesao, 3),
    };
    const macroSum = Object.values(macros).reduce((acc, value) => acc + (value ?? 0), 0);
    const nc = Number(macroSum.toFixed(2));

    const tlRaw = Number(pasState.TL);
    const tl = Number.isFinite(tlRaw) ? Math.min(Math.max(tlRaw, 8), 30) : null;

    const parseError = (value: string) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.floor(num));
    };
    const errorCounts = {
      grafia: parseError(pasState.erros.grafia),
      pontuacao: parseError(pasState.erros.pontuacao),
      propriedade: parseError(pasState.erros.propriedade),
    };
    const errors = { ...errorCounts };
    const ne = errorCounts.grafia + errorCounts.pontuacao + errorCounts.propriedade;
    const discount = tl && tl > 0 ? Number((2 / tl).toFixed(3)) : null;
    let nr: number | null = null;
    if (!annulled && discount != null) {
      nr = Number(Math.max(0, nc - ne * discount).toFixed(2));
    }
    if (annulled) {
      nr = 0;
    }

    return {
      macros,
      nc,
      tl,
      errors,
      ne,
      discount,
      nr,
    };
  }, [annulled, pasState]);

  const enemTotal = useMemo(() => {
    if (annulled) return 0;
    return calculateEnemTotal(enemSelections);
  }, [annulled, enemSelections]);

  const orderedAnnotations = useMemo(() => renumber(annotations), [annotations]);

  const handleLoadEssay = useCallback(async () => {
    if (!id) return;
    setLoadingEssay(true);
    try {
      const data = await fetchEssayById(id);
      setEssay(data);

      const annulInfo: Record<string, boolean> = {};
      if (Array.isArray(data?.annulReasons)) {
        data.annulReasons.forEach((reason: string) => {
          annulInfo[reason] = true;
        });
      } else if (typeof data?.annulmentReason === 'string' && data.annulmentReason) {
        annulInfo[data.annulmentReason] = true;
      }
      setAnnulState(annulInfo);
      if (!annulInfo.OUTROS) setAnnulOther('');

      if ((data?.pasBreakdown || data?.pas) && data.type === 'PAS') {
        const breakdown = data.pasBreakdown || data.pas || {};
        const errors = breakdown.erros || {};
        setPasState({
          apresentacao: toInputValue(breakdown?.apresentacao),
          argumentacao: toInputValue(breakdown?.argumentacao ?? breakdown?.conteudo),
          adequacao: toInputValue(breakdown?.adequacao ?? breakdown?.genero),
          coesao: toInputValue(breakdown?.coesao),
          TL: toInputValue(breakdown?.TL ?? breakdown?.NL),
          erros: {
            grafia: toInputValue(errors?.grafia ?? errors?.ortografia),
            pontuacao: toInputValue(errors?.pontuacao ?? errors?.gramatica),
            propriedade: toInputValue(errors?.propriedade ?? errors?.inadequacao),
          },
        });
      } else {
        setPasState(createEmptyPasState());
      }

      if (data.type === 'ENEM' && data.enemRubric) {
        const nextSelections = createInitialEnemSelections();
        ENEM_2024.forEach((competency) => {
          const selection = data.enemRubric?.[competency.key];
          if (!selection) return;
          nextSelections[competency.key] = sanitizeEnemSelection(competency.key, selection);
        });
        setEnemSelections(nextSelections);
      } else {
        setEnemSelections(createInitialEnemSelections());
      }

      try {
        const annotationResponse = await fetchAnnotations(id);
        setAnnotations(renumber(normalizeAnnotations(annotationResponse)));
      } catch (err) {
        console.error('[GradeWorkspace] Failed to load annotations', err);
        setAnnotations([]);
      }

      try {
        const score = await getEssayScore(id);
        if (score) {
          if (Array.isArray(score.reasons)) {
            const map: Record<string, boolean> = {};
            score.reasons.forEach((reason: string) => {
              map[reason] = true;
            });
            setAnnulState(map);
          } else {
            setAnnulState({});
          }
          if (typeof score.otherReason === 'string') {
            setAnnulOther(score.otherReason);
          } else {
            setAnnulOther('');
          }
          if (score.type === 'PAS' && score.pas) {
            const errors = score.pas.erros || {};
            setPasState({
              apresentacao: toInputValue(score.pas.apresentacao),
              argumentacao: toInputValue(score.pas.argumentacao ?? score.pas.conteudo),
              adequacao: toInputValue(score.pas.adequacao ?? score.pas.genero),
              coesao: toInputValue(score.pas.coesao),
              TL: toInputValue(score.pas.TL ?? score.pas.NL),
              erros: {
                grafia: toInputValue(errors?.grafia ?? errors?.ortografia),
                pontuacao: toInputValue(errors?.pontuacao ?? errors?.gramatica),
                propriedade: toInputValue(errors?.propriedade ?? errors?.inadequacao),
              },
            });
          }
          if (score.type === 'ENEM') {
            const nextSelections = createInitialEnemSelections();
            const competencies = score.enem?.competencies || {};
            ENEM_2024.forEach((competency, idx) => {
              const key = competency.key;
              const fromPayload = competencies?.[key];
              const levelFromPayload = typeof fromPayload?.level === 'number' ? fromPayload.level : undefined;
              const fallbackLevel = Array.isArray(score.enem?.levels)
                ? score.enem.levels[idx]
                : undefined;
              const level = Math.max(
                0,
                Math.min(
                  competency.levels.find((lvl) => lvl.level === levelFromPayload)?.level ?? fallbackLevel ?? nextSelections[key].level,
                  5,
                ),
              );
              const levelData = competency.levels.find((lvl) => lvl.level === level) ?? competency.levels[0];
              const validReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
              const reasonIds = Array.isArray(fromPayload?.reasonIds)
                ? fromPayload.reasonIds.filter((id: string) => validReasonIds.includes(id))
                : [];
              nextSelections[key] = { level, reasonIds };
            });
            setEnemSelections(nextSelections);
          } else {
            setEnemSelections(createInitialEnemSelections());
          }
        }
      } catch (err) {
        console.warn('[GradeWorkspace] Failed to load essay score', err);
      }

      setDirty(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Erro ao carregar redação.');
    } finally {
      setLoadingEssay(false);
    }
  }, [id]);

  useEffect(() => {
    handleLoadEssay();
  }, [handleLoadEssay]);

  useEffect(() => {
    if (!focusAnnotationId) return;
    const pendingId = focusAnnotationId;
    const timer = window.setTimeout(() => {
      setFocusAnnotationId((current) => (current === pendingId ? null : current));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [focusAnnotationId]);

  useEffect(() => {
    if (!liveMessage) return;
    const timer = window.setTimeout(() => setLiveMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [liveMessage]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-printing', generating ? '1' : '0');
    return () => {
      // garante reset em navegação/desmontagem
      document.documentElement.setAttribute('data-printing', '0');
    };
  }, [generating]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    (async () => {
      try {
        setPdfError(null);
        const token = await issueFileToken(id, { signal: controller.signal });
        const meta = await peekEssayFile(id, { token, signal: controller.signal });
        setPdfUrl(meta.url);
      } catch (err) {
        console.error('[GradeWorkspace] Failed to issue file token', err);
        setPdfUrl(essay?.originalUrl || null);
        setPdfError('Falha ao carregar PDF com token temporário.');
      }
    })();
    return () => controller.abort();
  }, [id, essay?.originalUrl]);

  const handleCreateAnnotation = (page: number, rect: NormalizedRect) => {
    const palette = HIGHLIGHT_CATEGORIES[activeCategory];
    const newAnnotation: AnnotationItem = {
      id: `local-${nanoid(8)}`,
      page,
      rects: [rect],
      category: activeCategory,
      comment: '',
      color: palette.color,
      number: annotations.length + 1,
    };
    setAnnotations((prev) => renumber([...prev, newAnnotation]));
    setSelectedAnnotationId(newAnnotation.id);
    setFocusAnnotationId(newAnnotation.id);
    setLiveMessage(`Comentário ${palette.label} adicionado`);
    setDirty(true);
  };

  const handleMoveAnnotation = (idAnn: string, rect: NormalizedRect) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === idAnn ? { ...ann, rects: [{ ...ann.rects[0], ...rect }] } : ann))
    );
    setDirty(true);
  };

  const handleCommentChange = (idAnn: string, comment: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === idAnn ? { ...ann, comment } : ann))
    );
    setDirty(true);
  };

  const handleDeleteAnnotation = (idAnn: string) => {
    setAnnotations((prev) => renumber(prev.filter((ann) => ann.id !== idAnn)));
    setDirty(true);
    if (selectedAnnotationId === idAnn) {
      setSelectedAnnotationId(null);
    }
    setLiveMessage('Comentário removido');
  };

  const handleToggleAnnul = (key: string, checked: boolean) => {
    setAnnulState((prev) => {
      const next = { ...prev, [key]: checked };
      if (!checked && key === 'OUTROS') {
        setAnnulOther('');
      }
      return next;
    });
    setDirty(true);
  };

  const handlePasChange = (field: PasFieldKey, value: string) => {
    setPasState((prev) => {
      if (field.startsWith('erros.')) {
        const [, key] = field.split('.') as ['erros', keyof PasState['erros']];
        return {
          ...prev,
          erros: {
            ...prev.erros,
            [key]: value,
          },
        };
      }
      if (field === 'TL') {
        return { ...prev, TL: value };
      }
      return {
        ...prev,
        [field]: value,
      } as PasState;
    });
    setDirty(true);
  };

  const handleEnemSelectionChange = (key: keyof EnemSelectionsMap, selection: { level: number; reasonIds: string[] }) => {
    setEnemSelections((prev) => ({
      ...prev,
      [key]: sanitizeEnemSelection(key, selection),
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payloadAnnotations = orderedAnnotations.map((ann, idx) => ({
        id: ann.id.startsWith('local-') ? undefined : ann.id,
        page: ann.page,
        rects: ann.rects.map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })),
        category: ann.category,
        color: ann.color,
        comment: ann.comment,
        number: idx + 1,
      }));

      const saved = await persistAnnotations(id, payloadAnnotations);
      if (Array.isArray(saved) && saved.length) {
        setAnnotations(renumber(normalizeAnnotations(saved)));
      }

      const selectedReasons = ANNUL_OPTIONS.filter((opt) => annulState[opt.key]).map((opt) => opt.key);
      const scorePayload = {
        type: essayType || 'PAS',
        annulled,
        reasons: selectedReasons,
        otherReason: annulOther || null,
      } as any;

      if ((essayType || essay?.model) === 'PAS') {
        scorePayload.type = 'PAS';
        scorePayload.pas = {
          apresentacao: pasDerived.macros.apresentacao,
          argumentacao: pasDerived.macros.argumentacao,
          adequacao: pasDerived.macros.adequacao,
          coesao: pasDerived.macros.coesao,
          NC: pasDerived.nc,
          TL: pasDerived.tl,
          NL: pasDerived.tl,
          NE: pasDerived.ne,
          descontoPorErro: pasDerived.discount,
          NR: annulled ? 0 : pasDerived.nr != null ? pasDerived.nr : null,
          erros: {
            grafia: pasDerived.errors.grafia,
            pontuacao: pasDerived.errors.pontuacao,
            propriedade: pasDerived.errors.propriedade,
          },
        };
      } else {
        scorePayload.type = 'ENEM';
        const levels: number[] = [];
        const points: number[] = [];
        const competencyPayload: Record<string, { level: number; reasonIds: string[] }> = {};
        ENEM_2024.forEach((competency) => {
          const selection = enemSelections[competency.key];
          const levelData = competency.levels.find((lvl) => lvl.level === selection?.level) ?? competency.levels[0];
          const validReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
          const reasonIds = (selection?.reasonIds ?? []).filter((id) => validReasonIds.includes(id));
          levels.push(levelData.level);
          points.push(levelData.points);
          competencyPayload[competency.key] = {
            level: levelData.level,
            reasonIds,
          };
        });
        scorePayload.enem = {
          levels,
          points,
          total: enemTotal,
          competencies: competencyPayload,
        };
      }

      await saveEssayScore(id, scorePayload);
      setDirty(false);
      toast.success('Correção salva.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Erro ao salvar correção.');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!essay) {
      toast.info('Carregando dados da redação. Tente novamente em instantes.');
      return;
    }
    if (dirty) {
      toast.info('Salve as alterações antes de gerar o PDF corrigido.');
      return;
    }
    setGenerating(true);
    try {
      const model: EssayModel = essayType === 'PAS' ? 'PAS/UnB' : 'ENEM';
      const finalScore =
        model === 'PAS/UnB'
          ? pasDerived.nr != null
            ? Number(pasDerived.nr).toFixed(1).replace('.', ',')
            : '0,0'
          : Math.max(0, Math.round(Number(enemTotal) || 0)).toString();
      const professorNameRaw = typeof user?.name === 'string' ? user.name.trim() : '';
      const professorName = professorNameRaw || 'Professor Yago Sales';
      const professorInitials = getInitialsFromName(professorName) || 'YS';
      const deliveredAtRaw =
        (essay as any)?.deliveredAt ??
        (essay as any)?.delivered_at ??
        (essay as any)?.deliveryDate ??
        (essay as any)?.submittedAt ??
        (essay as any)?.submitted_at ??
        null;
      const deliveredAt = typeof deliveredAtRaw === 'string' && deliveredAtRaw ? deliveredAtRaw : undefined;
      let pagesPng = Array.isArray((essay as any)?.pagesPng)
        ? (essay as any).pagesPng.filter((src: unknown): src is string => typeof src === 'string' && src.length > 0)
        : [];
      const annotationsForPdf = orderedAnnotations.flatMap((ann) => {
        if (!Array.isArray(ann.rects) || ann.rects.length === 0) return [];
        return ann.rects.map((rect, idx) => ({
          id: `${ann.id}-${idx}`,
          page: ann.page,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          kind: HIGHLIGHT_TO_KIND[ann.category] ?? 'general',
          text: ann.comment ?? '',
          number: ann.number,
        }));
      });

      const previewSource =
        (essay as any)?.correctedUrl ||
        pdfUrl ||
        (essay as any)?.originalUrl ||
        (essay as any)?.fileUrl ||
        null;
      if (previewSource) {
        try {
          const previewPng = await renderFirstPageToPng(previewSource, { maxWidth: 1200, page: 1, pixelRatio: 1.5 });
          if (previewPng) {
            pagesPng = [previewPng];
          }
        } catch (previewErr) {
          console.warn('[GradeWorkspace] Failed to generate preview PNG', previewErr);
        }
      }

      const enemCompetencyKeys = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;
      const enemLevels: [number, number, number, number, number] = enemCompetencyKeys.map((key) => {
        const selection = enemSelections[key];
        const level = selection?.level;
        if (Number.isFinite(level)) {
          return Math.max(0, Math.min(Number(level), 5));
        }
        return 0;
      }) as [number, number, number, number, number];
      const enemReasons = enemCompetencyKeys.map((key) => {
        const selection = enemSelections[key];
        return Array.isArray(selection?.reasonIds)
          ? selection.reasonIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
          : [];
      });

      const pasSummary = {
        apresentacao: Number(pasDerived.macros.apresentacao ?? 0) || 0,
        generoTextual: Number(pasDerived.macros.adequacao ?? 0) || 0,
        coesaoCoerencia: Number(pasDerived.macros.coesao ?? 0) || 0,
        conteudo: Number(pasDerived.macros.argumentacao ?? 0) || 0,
        nl: Number(pasDerived.tl ?? 0) || 0,
        erros: {
          grafiaAcentuacao: Number(pasDerived.errors.grafia ?? 0) || 0,
          pontuacaoMorfossintaxe: Number(pasDerived.errors.pontuacao ?? 0) || 0,
          propriedadeVocabular: Number(pasDerived.errors.propriedade ?? 0) || 0,
        },
      };

      let avatarDataUri = typeof studentPhoto === 'string' && studentPhoto.startsWith('data:') ? studentPhoto : undefined;
      if (!avatarDataUri && typeof studentPhoto === 'string' && /^https?:/i.test(studentPhoto)) {
        avatarDataUri = await toDataUriIfHttp(studentPhoto);
      }
      const bimestreNumber = Number.isFinite(Number(bimestreRaw)) ? Number(bimestreRaw) : null;
      const scoreInfo = {
        finalFormatted: finalScore,
        final: model === 'ENEM' ? Number(enemTotal ?? 0) : pasDerived.nr ?? null,
      };

      const pdfData: EssayPdfData = {
        student: {
          name: studentName,
          avatarUrl: studentPhoto ?? undefined,
          avatarDataUri: avatarDataUri,
          classLabel: turmaLabel || undefined,
          bimester: bimestreNumber,
          bimesterLabel: bimestreLabel || undefined,
        },
        professor: { name: professorName, initials: professorInitials },
        klass: { label: turmaLabel || '-' },
        termLabel: bimestreLabel || '',
        deliveredAt,
        theme: (essay as any)?.theme || (essay as any)?.topic || undefined,
        model,
        finalScore,
        score: scoreInfo,
        pagesPng,
        annotations: annotationsForPdf,
        enem:
          model === 'ENEM'
            ? {
                levels: enemLevels,
                reasons: enemReasons,
                total: enemTotal,
              }
            : undefined,
        pas:
          model === 'PAS/UnB'
            ? {
                apresentacao: pasSummary.apresentacao,
                generoTextual: pasSummary.generoTextual,
                coesaoCoerencia: pasSummary.coesaoCoerencia,
                conteudo: pasSummary.conteudo,
                nl: pasSummary.nl,
                erros: pasSummary.erros,
                neTotal: pasDerived.ne ?? 0,
                nr: pasDerived.nr ?? 0,
              }
            : undefined,
      };

      const bytes = await generateCorrectedPdf(pdfData);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `redacao-corrigida-${pdfData.student.name.replace(/\s+/g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      try {
        const uploadRes = await fetch(`/api/essays/${id}/corrections/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/pdf' },
          body: blob,
        });
        if (!uploadRes.ok) {
          throw new Error(`upload failed with status ${uploadRes.status}`);
        }
        toast.success('PDF corrigido gerado e salvo com sucesso.');
      } catch (uploadErr) {
        console.error('[GradeWorkspace] Failed to upload corrected PDF', uploadErr);
        toast.warn('PDF gerado, mas falhou ao salvar no servidor.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Erro ao gerar PDF corrigido.');
    } finally {
      setGenerating(false);
    }
  };

  const backToList = () => navigate(-1);

  const studentName = essay?.student?.name || essay?.studentName || '-';
  const rawPhoto =
    (essay?.student as any)?.avatarUrl ||
    (essay as any)?.studentAvatarUrl ||
    (essay?.student as any)?.photoUrl ||
    (essay?.student as any)?.avatar ||
    (essay?.student as any)?.image?.url ||
    (essay?.student as any)?.photo ||
    (essay?.student as any)?.picture ||
    null;
  const studentPhoto = useMemo(() => {
    if (!rawPhoto || typeof rawPhoto !== 'string') return null;
    if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) return rawPhoto;
    const cleaned = rawPhoto.trim();
    if (!cleaned) return null;
    const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(cleaned);
    if (looksBase64) {
      return `data:image/jpeg;base64,${cleaned.replace(/\s+/g, '')}`;
    }
    return cleaned;
  }, [rawPhoto]);
  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase())
    .join('') || 'A';
  const bimestreRaw = essay?.term ?? essay?.bimester ?? essay?.bimestre ?? essay?.bimesterNumber ?? null;
  const bimestreLabel =
    bimestreRaw != null && bimestreRaw !== ''
      ? Number.isFinite(Number(bimestreRaw))
        ? `${Number(bimestreRaw)}º bimestre`
        : String(bimestreRaw)
      : null;
  const turmaLabel = essay?.className || '-';
  const firstInfoLine = studentName;
  const secondInfoLine = [turmaLabel, bimestreLabel].filter(Boolean).join(', ') || '-';
  const typeLabel = essayType || '-';
  const themeLabel = essay?.theme || essay?.topic || '-';
  const thirdInfoLine = [typeLabel, themeLabel].filter(Boolean).join(', ') || '-';

  return (
    <div
      data-printing={generating ? '1' : '0'}
      className="mx-auto flex h-full w-full max-w-none flex-col gap-3 px-2 py-4 sm:px-3 lg:px-4"
    >
      {/* HERO COMPACTO ALINHADO AO PDF */}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        {/* HERO COMPACTO ALINHADO AO PDF */}
        <header
          className="hero hero--compact mb-3 rounded-2xl border border-orange-300 bg-orange-500/95 p-2 text-white shadow-md"
          aria-label="Cabeçalho de correção"
          style={{ ['--gw-hero-h' as any]: '72px' }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* BRAND (esquerda) */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center">
                <div className="hero-brand-mark">
                  <img
                    src={brandSrc}
                    alt="Logo Professor Yago Sales"
                    onError={() => setBrandSrc('/pdf/brand-mark.png')}
                  />
                </div>
                <span className="mt-1 text-[9px] font-medium leading-none opacity-95">
                  Professor Yago Sales
                </span>
              </div>

              {/* FOTO DO ALUNO + DADOS */}
              <div className="ml-3 flex items-center gap-3">
                <div className="h-9 w-9 md:h-10 md:w-10 overflow-hidden rounded-full ring-2 ring-white/30 bg-white/20 flex items-center justify-center text-[11px] font-bold">
                  {studentPhoto ? (
                    <img src={studentPhoto} alt={studentName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white">{studentInitials}</span>
                  )}
                </div>
                <div className="flex flex-col leading-tight text-white/95">
                  <p className="text-[12px] font-semibold leading-tight">{firstInfoLine}</p>
                  <p className="text-[10px] leading-tight">{secondInfoLine}</p>
                  <p className="text-[10px] leading-tight">{thirdInfoLine}</p>
                </div>
              </div>
            </div>

            {/* SCORE (direita) */}
            <div className="flex items-center">
              <div className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2 backdrop-blur">
                <div className="flex min-w-[88px] flex-col text-right">
                  <span className="text-[9px] uppercase tracking-wide text-white/85">Nota final</span>
                  <span className="text-lg font-extrabold leading-none">
                    {essayType === 'PAS'
                      ? (pasDerived.nr != null
                          ? Number(pasDerived.nr).toFixed(1).replace('.', ',')
                          : '0,0')
                      : Math.max(0, Math.round(Number(enemTotal) || 0)).toString()}
                  </span>
                  <span className="text-[9px] font-semibold text-white/85">{essayType === 'PAS' ? 'PAS/UnB' : 'ENEM'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-[260px_minmax(0,1fr)]"
          aria-label="Workspace de correção"
        >
          <aside className="order-1 md:order-none md:w-[260px] md:shrink-0 redacao-left-rail">
            {/* Mobile: action buttons + toolbar + action buttons */}
            <div className="mb-3 md:hidden">
              <div className="rail-actions mb-2 flex flex-wrap items-center gap-2">
                <Button className="btn btn--neutral" onClick={backToList}>
                  Voltar
                </Button>
                <Button
                  className="btn btn--neutral"
                  onClick={() => {
                    if (essay?.originalUrl) {
                      window.open(essay.originalUrl, '_blank', 'noopener,noreferrer');
                    } else if (pdfUrl) {
                      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      toast.info('Nenhum PDF disponível para abrir.');
                    }
                  }}
                >
                  Abrir original
                </Button>
              </div>

              <AnnotationToolbar active={activeCategory} onChange={setActiveCategory} orientation="horizontal" />

              <div className="rail-actions mt-2 flex flex-wrap items-center gap-2">
                <Button
                  className="btn btn--neutral"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
                <Button
                  className="btn btn--brand"
                  onClick={handleGeneratePdf}
                  disabled={generating}
                >
                  {generating ? 'Gerando…' : 'Gerar PDF corrigido'}
                </Button>
              </div>
            </div>
            {/* Desktop: action buttons + toolbar + action buttons (vertical) */}
            <div className="hidden md:block md:sticky md:top-24 gw-rail-raise" style={{ marginTop: 'calc(var(--gw-hero-h, 72px) - 12px)' }}>
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="rail-actions mb-2 flex flex-wrap items-center gap-2">
                  <Button className="btn btn--neutral" onClick={backToList}>
                    Voltar
                  </Button>
                  <Button
                    className="btn btn--neutral"
                    onClick={() => {
                      if (essay?.originalUrl) {
                        window.open(essay.originalUrl, '_blank', 'noopener,noreferrer');
                      } else if (pdfUrl) {
                        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        toast.info('Nenhum PDF disponível para abrir.');
                      }
                    }}
                  >
                    Abrir original
                  </Button>
                </div>

                <AnnotationToolbar
                  active={activeCategory}
                  onChange={setActiveCategory}
                  orientation="vertical"
                />

                <div className="rail-actions mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    className="btn btn--neutral"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                  >
                    {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button
                    className="btn btn--brand"
                    onClick={handleGeneratePdf}
                    disabled={generating}
                  >
                    {generating ? 'Gerando…' : 'Gerar PDF corrigido'}
                  </Button>
                </div>
              </div>
            </div>
          </aside>
          <div
            className="grid grid-cols-[minmax(0,1fr)_clamp(260px,20%,360px)] grid-rows-[auto_auto] gap-3"
            aria-label="Workspace de correção"
          >
            {/* Coluna central · Linha 1 — PDF */}
            <main className="min-w-0 col-start-1 row-start-1">
              {pdfError && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {pdfError}
                </p>
              )}
              <div className="pdf-canvas-wrap p-1">
                <div className="h-[78vh] min-h-[560px] w-full overflow-auto">
                  <PdfCorrectionViewer
                    fileUrl={pdfUrl}
                    annotations={orderedAnnotations}
                    selectedId={selectedAnnotationId}
                    activeCategory={activeCategory}
                    onCreateAnnotation={handleCreateAnnotation}
                    onMoveAnnotation={handleMoveAnnotation}
                    onSelectAnnotation={setSelectedAnnotationId}
                  />
                </div>
              </div>
            </main>

            {/* Coluna direita (20%) — Comentários (ocupa as 2 linhas) */}
            <aside
              className={`RightRailCard comments-rail gw-rail-raise md:sticky md:top-24 row-span-2 col-start-2 ${generating ? 'hidden' : ''}`}
              style={{ marginTop: 'calc(var(--gw-hero-h, 72px) - 12px)' }}
            >
              <div className="flex h-full min-h-[560px] w-full flex-col rounded-xl border border-slate-200 bg-white p-2">
                <div className="mt-0 flex-1 overflow-auto">
                  <AnnotationSidebar
                    annotations={orderedAnnotations}
                    selectedId={selectedAnnotationId}
                    onSelect={setSelectedAnnotationId}
                    onDelete={handleDeleteAnnotation}
                    onCommentChange={handleCommentChange}
                    focusId={focusAnnotationId}
                    liveMessage={liveMessage}
                  />
                </div>
              </div>
            </aside>

            {/* Coluna central · Linha 2 — Espelho do aluno */}
            <div className="col-start-1 row-start-2 min-w-0">
              <div className="mb-3">
                <MirrorSummaryInline
                  type={essayType}
                  pas={essayType === 'PAS' ? { nc: pasDerived.nc, tl: pasDerived.tl, ne: pasDerived.ne, discount: pasDerived.discount, nr: pasDerived.nr } : null}
                  enemTotal={enemTotal}
                />
              </div>
              <CorrectionMirror
                type={essayType}
                annulState={annulState}
                annulOther={annulOther}
                onToggleAnnul={handleToggleAnnul}
                onAnnulOtherChange={(value) => {
                  setAnnulOther(value);
                  setDirty(true);
                }}
                annulled={annulled}
                pasState={pasState}
                onPasChange={handlePasChange}
                enemSelections={enemSelections}
                onEnemSelectionChange={handleEnemSelectionChange}
                enemTotal={enemTotal}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

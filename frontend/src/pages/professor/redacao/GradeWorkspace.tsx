import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { AnnotationToolbar } from '@/components/redacao/AnnotationToolbar';
import { PdfCorrectionViewer } from '@/components/redacao/PdfCorrectionViewer';
import { AnnotationSidebar } from '@/components/redacao/AnnotationSidebar';
import { CorrectionMirror, ANNUL_OPTIONS } from '@/components/redacao/CorrectionMirror';
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
  generateCorrectedPdf,
} from '@/services/essays.service';

type PasState = {
  NC: string;
  NL: string;
  NE: string;
};

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
  const [pasState, setPasState] = useState<PasState>({ NC: '', NL: '', NE: '' });
  const [enemSelections, setEnemSelections] = useState<EnemSelectionsMap>(() => createInitialEnemSelections());

  const essayType = (essay?.type || essay?.model || null) as 'PAS' | 'ENEM' | null;
  const annulled = useMemo(
    () => Object.values(annulState).some(Boolean),
    [annulState]
  );

  const pasResult = useMemo(() => {
    const nc = Number(pasState.NC) || 0;
    const nl = Number(pasState.NL) || 0;
    const ne = Number(pasState.NE) || 0;
    if (nl <= 0) return 0;
    const value = nc - 2 * (ne / nl);
    return Math.max(0, Number.isFinite(value) ? value : 0);
  }, [pasState.NC, pasState.NE, pasState.NL]);

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
        const breakdown = data.pasBreakdown || data.pas;
        setPasState({
          NC: toInputValue(breakdown?.NC),
          NL: toInputValue(breakdown?.NL),
          NE: toInputValue(breakdown?.NE),
        });
      } else {
        setPasState({ NC: '', NL: '', NE: '' });
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
            setPasState({
              NC: toInputValue(score.pas.NC),
              NL: toInputValue(score.pas.NL),
              NE: toInputValue(score.pas.NE),
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

  const handlePasChange = (field: keyof PasState, value: string) => {
    setPasState((prev) => ({ ...prev, [field]: value }));
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
          NC: pasState.NC ? Number(pasState.NC) : null,
          NL: pasState.NL ? Number(pasState.NL) : null,
          NE: pasState.NE ? Number(pasState.NE) : null,
          NR: annulled ? 0 : Number(pasResult.toFixed(2)),
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
    if (!id) return;
    if (dirty) {
      toast.info('Salve as alterações antes de gerar o PDF corrigido.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateCorrectedPdf(id);
      if (result?.correctedUrl) {
        toast.success('PDF corrigido gerado com sucesso.');
        setEssay((prev: any) => ({
          ...prev,
          correctedUrl: result.correctedUrl,
          status: 'GRADED',
        }));
      } else {
        toast.success('PDF corrigido gerado.');
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
  const studentPhoto = (essay?.student as any)?.photo || (essay?.student as any)?.photoUrl || null;
  const summaryItems = [
    { label: 'Aluno', value: studentName },
    { label: 'Turma', value: essay?.className || '-' },
    { label: 'Tema', value: essay?.theme || essay?.topic || '-' },
    { label: 'Tipo', value: essayType || '-' },
    { label: 'Bimestre', value: essay?.term ?? essay?.bimester ?? essay?.bimestre ?? '-' },
  ];

  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-orange-400 bg-orange-50 text-lg font-semibold text-orange-600 shadow-sm sm:h-20 sm:w-20">
              {studentPhoto ? (
                <img src={studentPhoto} alt={studentName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{studentInitials}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Correção de redação</h1>
              <p className="text-sm text-slate-600">
                Professor(a): {user?.name || '—'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Ajuste os destaques e comentários para orientar o aluno na revisão da redação.
              </p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800 break-words">{item.value ?? '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" onClick={backToList}>
            Voltar
          </Button>
          <Button
            variant="ghost"
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
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button onClick={handleGeneratePdf} disabled={generating}>
            {generating ? 'Gerando…' : 'Gerar PDF corrigido'}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="lg:sticky lg:top-24 lg:w-52">
              <div className="lg:hidden">
                <AnnotationToolbar active={activeCategory} onChange={setActiveCategory} orientation="horizontal" />
              </div>
              <div className="hidden lg:flex">
                <AnnotationToolbar
                  active={activeCategory}
                  onChange={setActiveCategory}
                  orientation="vertical"
                  className="sticky top-24"
                />
              </div>
            </div>
            <div className="flex-1">
              {pdfError && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {pdfError}
                </p>
              )}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
                <div className="max-h-[82vh] min-h-[620px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
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
            </div>
          </div>
        </section>

        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <AnnotationSidebar
            annotations={orderedAnnotations}
            selectedId={selectedAnnotationId}
            onSelect={setSelectedAnnotationId}
            onDelete={handleDeleteAnnotation}
            onCommentChange={handleCommentChange}
            focusId={focusAnnotationId}
            liveMessage={liveMessage}
          />
        </section>
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
        pasResult={annulled ? 0 : pasResult}
        enemSelections={enemSelections}
        onEnemSelectionChange={handleEnemSelectionChange}
        enemTotal={enemTotal}
      />
    </div>
  );
}

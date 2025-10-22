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

const LEVEL_POINTS = [0, 40, 80, 120, 160, 200] as const;

function pointsToLevel(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const level = Math.round(value / 40);
  return Math.max(0, Math.min(level, 5));
}

function levelToPoints(level: number) {
  const idx = Math.max(0, Math.min(level, 5));
  return LEVEL_POINTS[idx] ?? 0;
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
  const [enemLevels, setEnemLevels] = useState<number[]>([0, 0, 0, 0, 0]);

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
    return enemLevels.reduce((acc, level) => acc + levelToPoints(level), 0);
  }, [annulled, enemLevels]);

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

      if (data?.enemCompetencies && data.type === 'ENEM') {
        const comps = data.enemCompetencies;
        setEnemLevels([
          pointsToLevel(comps?.c1),
          pointsToLevel(comps?.c2),
          pointsToLevel(comps?.c3),
          pointsToLevel(comps?.c4),
          pointsToLevel(comps?.c5),
        ]);
      } else {
        setEnemLevels([0, 0, 0, 0, 0]);
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
          if (score.type === 'ENEM' && Array.isArray(score.enem?.levels)) {
            const levels = score.enem.levels.map((lvl: number) => Math.max(0, Math.min(lvl, 5)));
            while (levels.length < 5) levels.push(0);
            setEnemLevels(levels.slice(0, 5));
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

  const handleEnemLevelChange = (index: number, level: number) => {
    setEnemLevels((prev) => {
      const next = prev.slice();
      next[index] = Math.max(0, Math.min(level, 5));
      return next;
    });
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
        scorePayload.enem = {
          levels: enemLevels,
          points: enemLevels.map((lvl) => levelToPoints(lvl)),
          total: enemTotal,
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

  const summaryItems = [
    { label: 'Aluno', value: essay?.student?.name || essay?.studentName || '-' },
    { label: 'Turma', value: essay?.className || '-' },
    { label: 'Tema', value: essay?.theme || essay?.topic || '-' },
    { label: 'Tipo', value: essayType || '-' },
    { label: 'Bimestre', value: essay?.term ?? essay?.bimester ?? essay?.bimestre ?? '-' },
  ];

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Correção de redação</h1>
          <p className="text-sm text-slate-600">
            Professor(a): {user?.name || '—'}
          </p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex gap-2">
                <dt className="text-slate-500">{item.label}:</dt>
                <dd className="font-medium text-slate-800">{item.value ?? '-'}</dd>
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
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <AnnotationToolbar active={activeCategory} onChange={setActiveCategory} />
          {pdfError && (
            <p className="mt-2 text-sm text-amber-600">{pdfError}</p>
          )}
          <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
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
        </section>

        <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
        enemLevels={enemLevels}
        onEnemLevelChange={handleEnemLevelChange}
        enemTotal={enemTotal}
      />
    </div>
  );
}

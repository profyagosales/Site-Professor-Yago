import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchEssayById,
  gradeEssay,
  renderCorrection,
} from '@/services/essays.service';
import { useCorrectedPdf } from '@/hooks/useCorrectedPdf';
import { useOptimisticAnnotations } from '@/services/annotations';
import AnnotationEditor from '@/components/redacao/AnnotationEditor';
import AnnotationEditorRich from '@/components/redacao/AnnotationEditorRich';
import type { Highlight } from '@/components/redacao/types';
import type { Anno } from '@/types/annotations';
import { toast } from 'react-toastify';
import Avatar from '@/components/Avatar';
import { api } from '@/services/api';
import { ROUTES } from '@/routes';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useFlag } from '@/flags';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import {
  buildPdfUrl,
  determinePdfStrategy,
  logPdfOpen,
  handlePdfError,
} from '@/features/viewer/pdfContract';
import '@/pdfSetup';

import { useRich, useIframe } from '@/config/env';

export default function GradeWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Feature flags
  const [pdfInlineViewer] = useFlag('pdf_inline_viewer', true);
  const [annotationsEnabled] = useFlag('annotations_enabled', true);

  // PDF loading states
  const [pdfStrategy, setPdfStrategy] = useState<
    'inline' | 'fallback' | 'loading'
  >('loading');
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [essay, setEssay] = useState<any | null>(null);
  // Hook para PDF corrigido
  const {
    isGenerating: isGeneratingPdf,
    isDownloading: isDownloadingPdf,
    isOpening: isOpeningPdf,
    error: correctedPdfError,
    status: pdfStatus,
    generatedPdf,
    pdfInfo,
    generatePdf,
    downloadPdf,
    openPdf,
    clearError: clearPdfError,
    canDownload,
    canOpen,
  } = useCorrectedPdf({
    showToasts: true,
    enableLogging: true,
  });

  // Hook otimista para anotações
  const {
    annotations,
    richAnnotations: richAnnos,
    isOptimistic,
    error: annotationsError,
    updateOptimistic,
    forceSave,
  } = useOptimisticAnnotations(id || '');

  // Hook para degradação offline
  const { getDisabledProps, shouldBlockAction } = useOfflineMode();

  const [comments, setComments] = useState('');
  const [weight, setWeight] = useState('1');
  const [annulReason, setAnnulReason] = useState('');
  const [annulOther, setAnnulOther] = useState('');
  const [bimestralValue, setBimestralValue] = useState('1');
  const [countInBimestral, setCountInBimestral] = useState(true);
  // ENEM
  const [c1, setC1] = useState('0');
  const [c2, setC2] = useState('0');
  const [c3, setC3] = useState('0');
  const [c4, setC4] = useState('0');
  const [c5, setC5] = useState('0');
  // PAS
  const [NC, setNC] = useState('0');
  const [NL, setNL] = useState('1');
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [autosaving, setAutosaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'saved' | 'saving' | 'error' | null
  >(null);
  const [undoStack, setUndoStack] = useState<
    Array<{ idx: number; ann: Highlight }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ idx: number; ann: Highlight }>
  >([]);
  const [dirty, setDirty] = useState(false);
  const [suppressDirty, setSuppressDirty] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [snapshot, setSnapshot] = useState<null | {
    annotations: Highlight[];
    comments: string;
    weight: string;
    bimestralPointsValue: string;
    countInBimestral: boolean;
    annulmentReason: string;
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
    NC: string;
    NL: string;
  }>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [fileBase, setFileBase] = useState('');
  const [fileToken, setFileToken] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<null | {
    annotations: Highlight[];
    richAnnos: Anno[];
    comments: string;
    weight: string;
    bimestralValue: string;
    countInBimestral: boolean;
    annulReason: string;
    annulOther: string;
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
    NC: string;
    NL: string;
    timestamp: number;
  }>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [localSaveTimeout, setLocalSaveTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [serverSaveTimeout, setServerSaveTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Hook para proteção de mudanças não salvas
  const { clearChanges } = useUnsavedChanges({
    hasChanges: dirty,
    message:
      'Você tem alterações não salvas na correção. Tem certeza que deseja sair?',
  });

  // Funções para gerenciar rascunho local
  const saveDraftToLocal = () => {
    if (!id) return;
    const draftData = {
      annotations,
      richAnnos,
      comments,
      weight,
      bimestralValue,
      countInBimestral,
      annulReason,
      annulOther,
      c1,
      c2,
      c3,
      c4,
      c5,
      NC,
      NL,
      timestamp: Date.now(),
    };
    localStorage.setItem(`essay:${id}:draft`, JSON.stringify(draftData));
    setDraft(draftData);
  };

  const loadDraftFromLocal = () => {
    if (!id) return;
    try {
      const stored = localStorage.getItem(`essay:${id}:draft`);
      if (stored) {
        const draftData = JSON.parse(stored);
        // Verifica se o rascunho é mais recente que 5 minutos
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (draftData.timestamp > fiveMinutesAgo) {
          setDraft(draftData);
          setShowRestoreDialog(true);
        } else {
          // Remove rascunho antigo
          localStorage.removeItem(`essay:${id}:draft`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
    }
  };

  const clearDraft = () => {
    if (!id) return;
    localStorage.removeItem(`essay:${id}:draft`);
    setDraft(null);
  };

  const restoreDraft = () => {
    if (!draft) return;
    setAnnotations(draft.annotations);
    // richAnnos é gerenciado pelo hook otimista
    setComments(draft.comments);
    setWeight(draft.weight);
    setBimestralValue(draft.bimestralValue);
    setCountInBimestral(draft.countInBimestral);
    setAnnulReason(draft.annulReason);
    setAnnulOther(draft.annulOther);
    setC1(draft.c1);
    setC2(draft.c2);
    setC3(draft.c3);
    setC4(draft.c4);
    setC5(draft.c5);
    setNC(draft.NC);
    setNL(draft.NL);
    setDirty(true);
    setShowRestoreDialog(false);
    clearDraft();
  };

  const discardDraft = () => {
    setShowRestoreDialog(false);
    clearDraft();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await fetchEssayById(id);
        if (!alive) return;
        setEssay(data);
        if (data?.annotations) setAnnotations(data.annotations as any);
        // richAnnotations é gerenciado pelo hook otimista
        if (data?.comments) setComments(data.comments);
        if (data?.bimestreWeight) setWeight(String(data.bimestreWeight));
        if (data?.bimestralPointsValue != null)
          setBimestralValue(String(data.bimestralPointsValue));
        if (data?.countInBimestral !== undefined)
          setCountInBimestral(Boolean(data.countInBimestral));
        if (data?.type === 'ENEM' && data?.enemCompetencies) {
          setC1(String(data.enemCompetencies.c1 || 0));
          setC2(String(data.enemCompetencies.c2 || 0));
          setC3(String(data.enemCompetencies.c3 || 0));
          setC4(String(data.enemCompetencies.c4 || 0));
          setC5(String(data.enemCompetencies.c5 || 0));
        }
        if (data?.type === 'PAS' && data?.pasBreakdown) {
          setNC(String(data.pasBreakdown.NC || 0));
          setNL(String(data.pasBreakdown.NL || 1));
        }
        setAnnulReason(data?.annulmentReason || '');
        // initialize snapshot and clear dirty tracking
        const snap = {
          annotations: data?.annotations || [],
          comments: data?.comments || '',
          weight: String(data?.bimestreWeight || '1'),
          bimestralPointsValue: String(data?.bimestralPointsValue || '1'),
          countInBimestral: Boolean(data?.countInBimestral),
          annulmentReason: String(data?.annulmentReason || ''),
          c1: String(data?.enemCompetencies?.c1 || '0'),
          c2: String(data?.enemCompetencies?.c2 || '0'),
          c3: String(data?.enemCompetencies?.c3 || '0'),
          c4: String(data?.enemCompetencies?.c4 || '0'),
          c5: String(data?.enemCompetencies?.c5 || '0'),
          NC: String(data?.pasBreakdown?.NC || '0'),
          NL: String(data?.pasBreakdown?.NL || '1'),
        };
        setSnapshot(snap);
        setDirty(false);
        setSuppressDirty(false);

        // Carregar rascunho local após carregar dados do servidor
        loadDraftFromLocal();
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar redação');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      // Limpa timeouts ao desmontar
      if (localSaveTimeout) clearTimeout(localSaveTimeout);
      if (serverSaveTimeout) clearTimeout(serverSaveTimeout);
    };
  }, [id]);

  const effectiveAnnul =
    annulReason === 'Outros' ? annulOther.trim() : annulReason;
  const enemPreview = useMemo(() => {
    const total = [c1, c2, c3, c4, c5]
      .map(n => Number(n) || 0)
      .reduce((a, b) => a + b, 0);
    const bVal = Number(bimestralValue) || 0;
    const bimestral = countInBimestral
      ? effectiveAnnul
        ? 0
        : (total / 1000) * bVal
      : null;
    return { total, bimestral };
  }, [c1, c2, c3, c4, c5, bimestralValue, countInBimestral, effectiveAnnul]);
  const [forceAnnotator, setForceAnnotator] = useState<
    null | 'rich' | 'legacy'
  >(null);
  const useNewAnnotator = forceAnnotator
    ? forceAnnotator === 'rich'
    : Boolean((window as any).YS_USE_RICH_ANNOS);
  const neCount = useMemo(
    () => annotations.filter(a => a.color === 'green').length,
    [annotations]
  );
  const nr = useMemo(() => {
    const nc = Number(NC);
    const nl = Math.max(1, Number(NL));
    const raw = nc - (2 * neCount) / nl;
    return Math.max(0, Math.min(10, raw));
  }, [NC, NL, neCount]);
  const pasBimestral = useMemo(() => {
    if (!countInBimestral) return null;
    const bVal = Number(bimestralValue);
    if (Number.isNaN(bVal)) return null;
    return effectiveAnnul ? 0 : (nr / 10) * bVal;
  }, [countInBimestral, bimestralValue, nr, effectiveAnnul]);

  // navegação de anotações removida no modo iframe

  // Mark form dirty on relevant changes
  useEffect(() => {
    if (!loading && !suppressDirty) setDirty(true);
  }, [
    annotations,
    comments,
    c1,
    c2,
    c3,
    c4,
    c5,
    NC,
    NL,
    weight,
    annulReason,
    bimestralValue,
    countInBimestral,
    loading,
    suppressDirty,
  ]);
  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  // navigation guard in-app
  useEffect(() => {
    const unblock = (navigate as any).block?.((tx: any) => {
      if (!dirty) return;
      if (
        window.confirm('Há alterações não salvas. Deseja sair mesmo assim?')
      ) {
        unblock();
        tx.retry();
      }
    });
    return () => {
      if (typeof unblock === 'function') unblock();
    };
  }, [dirty]);

  // Undo/Redo keyboard: Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo =
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey));
      if (isUndo) {
        e.preventDefault();
        if (undoStack.length > 0) {
          const last = undoStack[0];
          setUndoStack(s => s.slice(1));
          setRedoStack(s =>
            [{ idx: last.idx, ann: last.ann }, ...s].slice(0, 20)
          );
          setAnnotations(prev => {
            const next = prev.slice();
            const insertAt = Math.min(last.idx, next.length);
            next.splice(insertAt, 0, last.ann);
            return next;
          });
          setSelectedIndex(Math.min(last.idx, annotations.length));
        }
      } else if (isRedo) {
        e.preventDefault();
        if (redoStack.length > 0) {
          const last = redoStack[0];
          setRedoStack(s => s.slice(1));
          setUndoStack(s =>
            [{ idx: last.idx, ann: last.ann }, ...s].slice(0, 20)
          );
          setAnnotations(prev =>
            prev.filter((_, i) => i !== Math.min(last.idx, prev.length - 1))
          );
          setSelectedIndex(null);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoStack, redoStack, annotations.length]);

  // Autosave local: debounce de 800ms para salvar rascunho
  useEffect(() => {
    if (!dirty || !essay) return;

    // Limpa timeout anterior
    if (localSaveTimeout) {
      clearTimeout(localSaveTimeout);
    }

    // Salva rascunho local com debounce de 800ms
    const timeout = setTimeout(() => {
      saveDraftToLocal();
    }, 800);

    setLocalSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    dirty,
    essay,
    annotations,
    richAnnos,
    comments,
    weight,
    bimestralValue,
    countInBimestral,
    annulReason,
    annulOther,
    c1,
    c2,
    c3,
    c4,
    c5,
    NC,
    NL,
  ]);

  // Autosave servidor: debounce de 800ms separado para salvar no servidor
  // Autosave é gerenciado pelo hook otimista

  // carregar PDF via iframe viewer
  useEffect(() => {
    if (!id || !useIframe) return;

    let alive = true;
    setPdfReady(false);
    setIframeError(null);
    setPdfStrategy('loading');
    setPdfError(null);

    (async () => {
      try {
        // 1) buscar token curto
        const { data: tok } = await api.get(`/essays/${id}/file-token`);
        const fileUrl = `${api.defaults.baseURL}/essays/${id}/file`;

        if (!alive) return;

        // 2) determinar estratégia de carregamento
        const strategy = await determinePdfStrategy(id, tok?.token);

        if (!alive) return;

        setPdfStrategy(strategy);

        if (strategy === 'inline') {
          // 3) validar com HEAD request para inline
          try {
            await api.head(`/essays/${id}/file`, {
              headers: { Authorization: `Bearer ${tok.token}` },
            });

            if (!alive) return;

            setFileBase(fileUrl);
            setFileToken(tok?.token);
            setPdfReady(true);

            // Log de abertura
            logPdfOpen(id, true, !!tok?.token);
          } catch (headError: any) {
            if (!alive) return;

            const errorMessage = handlePdfError(headError, id);
            setPdfError(errorMessage);
            setPdfStrategy('fallback');
          }
        } else {
          // Fallback: apenas preparar para abrir em nova aba
          setFileBase(fileUrl);
          setFileToken(tok?.token);

          // Log de abertura
          logPdfOpen(id, false, !!tok?.token);
        }
      } catch (error: any) {
        if (!alive) return;

        const errorMessage = handlePdfError(error, id);
        setPdfError(errorMessage);
        setPdfStrategy('fallback');
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, useIframe]);

  function sendFileToIframe() {
    if (!iframeRef.current || !fileBase || !fileToken) return;
    // 2) mandar pro iframe
    iframeRef.current.contentWindow?.postMessage(
      {
        type: 'open',
        payload: { url: fileBase, token: fileToken },
      },
      '*'
    );
  }

  useEffect(() => {
    sendFileToIframe();
  }, [fileBase, fileToken]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.type === 'height' && iframeRef.current) {
        iframeRef.current.style.height = `${msg.value}px`;
      } else if (msg?.type === 'annos-changed') {
        setAnnotations(msg.payload || []);
      } else if (msg?.type === 'error') {
        setIframeError(msg.message || 'Erro');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  async function submit(generatePdf = false) {
    if (!essay) return;
    try {
      setLoading(true);
      // Força salvamento das anotações antes de corrigir
      await forceSave();
      if (essay.type === 'ENEM') {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'ENEM',
          weight: Number(weight) || 1,
          annulmentReason: effectiveAnnul || undefined,
          countInBimestral,
          bimestralPointsValue: Number(bimestralValue) || 0,
          enemCompetencies: {
            c1: Number(c1),
            c2: Number(c2),
            c3: Number(c3),
            c4: Number(c4),
            c5: Number(c5),
          },
          comments,
        });
      } else {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'PAS',
          weight: Number(weight) || 1,
          annulmentReason: effectiveAnnul || undefined,
          countInBimestral,
          bimestralPointsValue: Number(bimestralValue) || 0,
          pas: { NC: Number(NC), NL: Number(NL) },
          comments,
        });
      }
      if (generatePdf) {
        await renderCorrection(essay._id || essay.id);
      }
      toast.success('Correção salva');
      setDirty(false);
      setLastSavedAt(new Date());
      setSnapshot({
        annotations,
        comments,
        weight,
        bimestralPointsValue: bimestralValue,
        countInBimestral,
        annulmentReason: effectiveAnnul,
        c1,
        c2,
        c3,
        c4,
        c5,
        NC,
        NL,
      });
      // Limpa rascunho local após salvar com sucesso
      clearDraft();
      // Limpa proteção de mudanças não salvas
      clearChanges();
      navigate(ROUTES.prof.redacao);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePdf = async () => {
    if (!id) return;
    await generatePdf(id);
  };

  const handleDownloadPdf = async () => {
    await downloadPdf();
  };

  const handleOpenPdf = async () => {
    await openPdf();
  };

  if (loading && !essay) return <div className='p-6'>Carregando…</div>;
  if (err) return <div className='p-6 text-red-600'>{err}</div>;
  if (!essay) return null;

  async function openPdfInNewTab() {
    if (!id) return;
    try {
      // Usar contrato para construir URL
      const pdfUrl = buildPdfUrl(id, fileToken);

      // Abrir em nova aba com segurança
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');

      // Log de abertura em nova aba
      logPdfOpen(id, false, !!fileToken);
    } catch (e) {
      console.error('openPdfInNewTab error', e);
      const errorMessage = handlePdfError(e, id);
      alert(errorMessage);
    }
  }

  return (
    <div className='p-4 md:p-6 space-y-4'>
      {process.env.NODE_ENV === 'development' && (
        <div className='text-xs text-ys-ink-2'>
          Flag rich: {String((window as any).YS_USE_RICH_ANNOS)} • mime:{' '}
          {essay.originalMimeType || '-'}
        </div>
      )}

      {/* Diálogo de restauração de rascunho */}
      {showRestoreDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Restaurar rascunho?
            </h3>
            <p className='text-sm text-gray-600 mb-6'>
              Foi encontrado um rascunho salvo localmente. Deseja restaurar as
              alterações não salvas?
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={discardDraft}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors'
              >
                Descartar
              </button>
              <button
                onClick={restoreDraft}
                className='px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors'
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Avatar
            src={essay.studentId?.photo}
            name={essay.studentId?.name}
            className='h-16 w-16'
          />
          <div>
            <h2 className='text-lg font-semibold'>
              {essay.studentId?.name || '-'}
            </h2>
            <p className='text-sm text-ys-ink-2'>
              {essay.classId
                ? `${essay.classId.series || ''}${essay.classId.letter || ''}`
                : '-'}
              {essay.studentId?.rollNumber != null
                ? ` • Nº ${essay.studentId.rollNumber}`
                : ''}
            </p>
            <p className='text-sm text-ys-ink-2'>
              Tema: {essay.customTheme || essay.theme?.name || '-'}
            </p>
            <p className='text-sm text-ys-ink-2'>Modelo: {essay.type}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {dirty && (
            <span className='mr-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800'>
              <span className='inline-block h-2 w-2 rounded-full bg-yellow-500' />
              Não salvo
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className='mr-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
              <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent' />
              Salvando…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className='mr-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'>
              <span className='inline-block h-2 w-2 rounded-full bg-green-500' />
              Salvo
            </span>
          )}
          {saveStatus === 'error' && (
            <span className='mr-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700'>
              <span className='inline-block h-2 w-2 rounded-full bg-red-500' />
              Erro ao salvar
            </span>
          )}
          {!saveStatus && !dirty && lastSavedAt && (
            <span className='mr-2 text-xs text-ys-ink-2'>
              Salvo às{' '}
              {lastSavedAt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {draft && (
            <span className='mr-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
              <span className='inline-block h-2 w-2 rounded-full bg-blue-500' />
              Rascunho salvo
            </span>
          )}
          <button
            className='rounded-lg border border-[#E5E7EB] px-3 py-1.5'
            onClick={() => navigate(ROUTES.prof.redacao)}
          >
            Voltar
          </button>
          {process.env.NODE_ENV === 'development' && (
            <div className='ml-2 flex items-center gap-1 text-xs text-ys-ink-2'>
              <span>Annotator:</span>
              <select
                className='rounded border p-1'
                value={forceAnnotator || 'auto'}
                onChange={e => setForceAnnotator(e.target.value as any)}
              >
                <option value='auto'>auto</option>
                <option value='rich'>rich</option>
                <option value='legacy'>legacy</option>
              </select>
            </div>
          )}
          <button
            className='inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-60'
            disabled={loading || shouldBlockAction('save_essay')}
            title={
              shouldBlockAction('save_essay')
                ? 'Serviço temporariamente indisponível'
                : undefined
            }
            onClick={() => {
              if (shouldBlockAction('save_essay')) return;
              submit(false);
            }}
          >
            {loading && (
              <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent' />
            )}
            <span>Salvar</span>
          </button>
          <button
            className='inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-white disabled:opacity-60'
            disabled={loading || shouldBlockAction('save_and_generate_pdf')}
            title={
              shouldBlockAction('save_and_generate_pdf')
                ? 'Serviço temporariamente indisponível'
                : undefined
            }
            onClick={() => {
              if (shouldBlockAction('save_and_generate_pdf')) return;
              submit(true);
            }}
          >
            {loading && (
              <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent' />
            )}
            <span>Gerar PDF corrigido</span>
          </button>
          
          {/* Botões de PDF corrigido */}
          {generatedPdf && (
            <>
              <button
                className='inline-flex items-center gap-2 rounded-lg border border-green-500 px-3 py-1.5 text-green-600 hover:bg-green-50 disabled:opacity-60'
                disabled={isDownloadingPdf || !canDownload}
                onClick={handleDownloadPdf}
                title="Baixar PDF corrigido"
              >
                {isDownloadingPdf && (
                  <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent' />
                )}
                <span>Baixar PDF</span>
              </button>
              
              <button
                className='inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-white hover:bg-blue-600 disabled:opacity-60'
                disabled={isOpeningPdf || !canOpen}
                onClick={handleOpenPdf}
                title="Abrir PDF corrigido em nova aba"
              >
                {isOpeningPdf && (
                  <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent' />
                )}
                <span>Abrir PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status do PDF corrigido */}
      {(isGeneratingPdf || pdfStatus || correctedPdfError) && (
        <div className='mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
          {isGeneratingPdf && (
            <div className='flex items-center gap-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500'></div>
              <span className='text-sm text-blue-700'>
                {pdfStatus || 'Gerando PDF corrigido...'}
              </span>
            </div>
          )}
          
          {correctedPdfError && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <svg className='w-4 h-4 text-red-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className='text-sm text-red-700'>{correctedPdfError}</span>
              </div>
              <button
                onClick={clearPdfError}
                className='text-sm text-red-600 underline hover:text-red-800'
              >
                Fechar
              </button>
            </div>
          )}
          
          {generatedPdf && pdfInfo && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <svg className='w-4 h-4 text-green-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className='text-sm text-green-700'>
                  PDF corrigido pronto ({pdfInfo.sizeFormatted})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]'>
        <div className='min-h-[420px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]'>
          {/* Status */}
          {useIframe && pdfInlineViewer ? (
            pdfStrategy === 'inline' && pdfReady && !iframeError ? (
              <iframe
                ref={iframeRef}
                src='/viewer/index.html'
                className='w-full border-0'
                onLoad={sendFileToIframe}
              />
            ) : pdfStrategy === 'loading' ? (
              <div className='p-4 text-sm text-ys-ink-2 text-center'>
                <div className='flex items-center justify-center gap-2'>
                  <div className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-ys-amber border-t-transparent' />
                  <span>Verificando compatibilidade do PDF...</span>
                </div>
              </div>
            ) : (
              <div className='p-4 text-sm text-ys-ink-2'>
                {iframeError || pdfError || 'Carregando PDF…'}
                {id && (
                  <button
                    className='ml-2 underline disabled:opacity-50 disabled:cursor-not-allowed'
                    disabled={shouldBlockAction('open_pdf')}
                    title={
                      shouldBlockAction('open_pdf')
                        ? 'Serviço temporariamente indisponível'
                        : undefined
                    }
                    onClick={() => {
                      if (shouldBlockAction('open_pdf')) return;
                      openPdfInNewTab();
                    }}
                  >
                    Abrir em nova aba
                  </button>
                )}
              </div>
            )
          ) : (
            <div className='p-4 text-sm text-ys-ink-2'>
              {!pdfInlineViewer ? (
                <div className='text-center'>
                  <div className='mb-4 text-lg font-medium text-ys-ink'>
                    Visualização inline desabilitada
                  </div>
                  <div className='mb-4 text-sm text-ys-ink-2'>
                    O PDF viewer inline foi desabilitado via feature flag.
                  </div>
                  {id && (
                    <button
                      className='px-4 py-2 bg-ys-amber text-white rounded-lg hover:bg-ys-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                      disabled={shouldBlockAction('open_pdf')}
                      title={
                        shouldBlockAction('open_pdf')
                          ? 'Serviço temporariamente indisponível'
                          : undefined
                      }
                      onClick={() => {
                        if (shouldBlockAction('open_pdf')) return;
                        openPdfInNewTab();
                      }}
                    >
                      Abrir PDF em nova aba
                    </button>
                  )}
                </div>
              ) : pdfStrategy === 'fallback' ? (
                <div className='text-center'>
                  <div className='mb-4 text-lg font-medium text-ys-ink'>
                    Visualização inline não disponível
                  </div>
                  <div className='mb-4 text-sm text-ys-ink-2'>
                    {pdfError ||
                      'O PDF não pode ser exibido inline neste dispositivo.'}
                  </div>
                  {id && (
                    <button
                      className='px-4 py-2 bg-ys-amber text-white rounded-lg hover:bg-ys-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                      disabled={shouldBlockAction('open_pdf')}
                      title={
                        shouldBlockAction('open_pdf')
                          ? 'Serviço temporariamente indisponível'
                          : undefined
                      }
                      onClick={() => {
                        if (shouldBlockAction('open_pdf')) return;
                        openPdfInNewTab();
                      }}
                    >
                      Abrir PDF em nova aba
                    </button>
                  )}
                </div>
              ) : (
                'Visualização de PDF desativada'
              )}
            </div>
          )}
        </div>
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-4'>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Peso
              </label>
              <input
                value={weight}
                onChange={e => setWeight(e.target.value)}
                type='number'
                min={0}
                max={10}
                className='w-full rounded border p-2'
                disabled={!countInBimestral}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-[#111827]'>
                Valor bimestral
              </label>
              <input
                value={bimestralValue}
                onChange={e => setBimestralValue(e.target.value)}
                type='number'
                min={0}
                className='w-full rounded border p-2'
                disabled={!countInBimestral}
              />
            </div>
            <label className='inline-flex items-center gap-2 mt-6 text-sm text-[#111827]'>
              <input
                type='checkbox'
                checked={countInBimestral}
                onChange={e => setCountInBimestral(e.target.checked)}
              />{' '}
              Contar no bimestre
            </label>
            <div className='mt-6'>
              <label className='block text-sm font-medium text-[#111827]'>
                Anular
              </label>
              <select
                className='rounded border p-2 text-sm'
                value={annulReason}
                onChange={e => setAnnulReason(e.target.value)}
              >
                <option value=''>—</option>
                <option value='Menos de 7 linhas'>Menos de 7 linhas</option>
                <option value='Fuga ao tema'>Fuga ao tema</option>
                <option value='Cópia'>Cópia</option>
                <option value='Letra ilegível'>Letra ilegível</option>
                <option value='Identificação'>Identificação</option>
                <option value='Parte desconectada'>Parte desconectada</option>
                <option value='Outros'>Outros</option>
              </select>
              {annulReason === 'Outros' && (
                <input
                  type='text'
                  value={annulOther}
                  onChange={e => setAnnulOther(e.target.value)}
                  className='mt-2 w-full rounded border p-2 text-sm'
                  placeholder='Motivo'
                />
              )}
            </div>
          </div>

          {essay.type === 'ENEM' ? (
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-[#111827]'>
                Competências ENEM
              </label>
              <div className='grid grid-cols-5 gap-2'>
                {[
                  { v: c1, s: setC1 },
                  { v: c2, s: setC2 },
                  { v: c3, s: setC3 },
                  { v: c4, s: setC4 },
                  { v: c5, s: setC5 },
                ].map((o, i) => (
                  <select
                    key={i}
                    value={o.v}
                    onChange={e => o.s(e.target.value)}
                    className='rounded border p-2'
                  >
                    {[0, 40, 80, 120, 160, 200].map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              <p className='text-sm text-ys-ink-2'>
                Total ENEM:{' '}
                <span className='font-medium text-[#111827]'>
                  {effectiveAnnul ? 0 : enemPreview.total}
                </span>{' '}
                / 1000 {effectiveAnnul && '(anulada)'}
              </p>
              {countInBimestral && (
                <p className='text-sm text-ys-ink-2'>
                  Prévia bimestral:{' '}
                  <span className='font-medium text-[#111827]'>
                    {(enemPreview.bimestral ?? 0).toFixed(1)}
                  </span>{' '}
                  / {bimestralValue}
                </p>
              )}
            </div>
          ) : (
            <div className='space-y-2'>
              <div className='grid gap-2 md:grid-cols-2'>
                <div>
                  <label className='block text-sm font-medium text-[#111827]'>
                    NC (0–10)
                  </label>
                  <input
                    type='number'
                    min={0}
                    max={10}
                    value={NC}
                    onChange={e => setNC(e.target.value)}
                    className='w-full rounded border p-2'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-[#111827]'>
                    NL (≥1)
                  </label>
                  <input
                    type='number'
                    min={1}
                    value={NL}
                    onChange={e => setNL(e.target.value)}
                    className='w-full rounded border p-2'
                  />
                </div>
              </div>
              <p className='text-sm text-ys-ink-2'>
                NE (auto):{' '}
                <span className='font-medium text-[#111827]'>{neCount}</span>
              </p>
              <p className='text-sm text-ys-ink-2'>
                NR = NC - 2 * NE / NL = {Number(NC) || 0} - 2 * {neCount} /{' '}
                {Number(NL) || 1} =
                <span className='font-medium text-[#111827]'>
                  {' '}
                  {effectiveAnnul ? 0 : nr.toFixed(2)}
                </span>
                {effectiveAnnul && ' (anulada)'}
              </p>
              {countInBimestral && (
                <p className='text-sm text-ys-ink-2'>
                  Prévia bimestral:{' '}
                  <span className='font-medium text-[#111827]'>
                    {(pasBimestral ?? 0).toFixed(1)}
                  </span>{' '}
                  / {bimestralValue}
                </p>
              )}
            </div>
          )}

          <label className='block text-sm font-medium text-[#111827]'>
            Comentários
          </label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            className='h-28 w-full rounded border p-2'
            placeholder='Feedback opcional'
          />
        </div>
      </div>
    </div>
  );
}

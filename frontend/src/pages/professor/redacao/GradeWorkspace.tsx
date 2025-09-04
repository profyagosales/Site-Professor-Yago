import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEssayById, gradeEssay, getAnnotations, saveAnnotations, renderCorrection } from '@/services/essays.service';
import AnnotationEditor from '@/components/redacao/AnnotationEditor';
import AnnotationEditorRich from '@/components/redacao/AnnotationEditorRich';
import type { Highlight } from '@/components/redacao/types';
import type { Anno } from '@/types/annotations';
import { toast } from 'react-toastify';
import Avatar from '@/components/Avatar';
import { api } from '@/services/api';
import '@/pdfSetup';

const useRich =
  import.meta.env.VITE_USE_RICH_ANNOS === '1' ||
  import.meta.env.VITE_USE_RICH_ANNOS === 'true';
const useIframe = import.meta.env.VITE_PDF_IFRAME !== '0';

export default function GradeWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [essay, setEssay] = useState<any | null>(null);
  const [annotations, setAnnotations] = useState<Highlight[]>([]);
  const [richAnnos, setRichAnnos] = useState<Anno[]>([]);
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [undoStack, setUndoStack] = useState<Array<{ idx: number; ann: Highlight }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ idx: number; ann: Highlight }>>([]);
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
    c1: string; c2: string; c3: string; c4: string; c5: string;
    NC: string; NL: string;
  }>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [fileBase, setFileBase] = useState('');
  const [fileToken, setFileToken] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
  if (data?.richAnnotations) setRichAnnos(data.richAnnotations);
  if (data?.comments) setComments(data.comments);
  if (data?.bimestreWeight) setWeight(String(data.bimestreWeight));
  if (data?.bimestralPointsValue != null) setBimestralValue(String(data.bimestralPointsValue));
  if (data?.countInBimestral !== undefined) setCountInBimestral(Boolean(data.countInBimestral));
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
      } catch (e:any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar redação');
      } finally { setLoading(false); }
    })();
    return () => { alive = false };
  }, [id]);

  const effectiveAnnul = annulReason === 'Outros' ? annulOther.trim() : annulReason;
  const enemPreview = useMemo(() => {
    const total = [c1, c2, c3, c4, c5]
      .map((n) => Number(n) || 0)
      .reduce((a, b) => a + b, 0);
    const bVal = Number(bimestralValue) || 0;
    const bimestral = countInBimestral
      ? effectiveAnnul
        ? 0
        : (total / 1000) * bVal
      : null;
    return { total, bimestral };
  }, [c1, c2, c3, c4, c5, bimestralValue, countInBimestral, effectiveAnnul]);
  const [forceAnnotator, setForceAnnotator] = useState<null | 'rich' | 'legacy'>(null);
  const useNewAnnotator = forceAnnotator ? forceAnnotator === 'rich' : Boolean((window as any).YS_USE_RICH_ANNOS);
  const neCount = useMemo(() => annotations.filter(a => a.color === 'green').length, [annotations]);
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
  useEffect(() => { if (!loading && !suppressDirty) setDirty(true); }, [annotations, comments, c1, c2, c3, c4, c5, NC, NL, weight, annulReason, bimestralValue, countInBimestral, loading, suppressDirty]);
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
      if (window.confirm('Há alterações não salvas. Deseja sair mesmo assim?')) {
        unblock();
        tx.retry();
      }
    });
    return () => { if (typeof unblock === 'function') unblock(); };
  }, [dirty]);

  // Undo/Redo keyboard: Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey));
      if (isUndo) {
        e.preventDefault();
        if (undoStack.length > 0) {
          const last = undoStack[0];
          setUndoStack((s)=> s.slice(1));
          setRedoStack((s)=> [{ idx: last.idx, ann: last.ann }, ...s].slice(0, 20));
          setAnnotations((prev)=> {
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
          setRedoStack((s)=> s.slice(1));
          setUndoStack((s)=> [{ idx: last.idx, ann: last.ann }, ...s].slice(0, 20));
          setAnnotations((prev)=> prev.filter((_, i) => i !== Math.min(last.idx, prev.length - 1)));
          setSelectedIndex(null);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoStack, redoStack, annotations.length]);

  // Autosave: debounce de 500ms e timer de segurança
  useEffect(() => {
    if (!dirty || !essay) return;
    
    const debounce = setTimeout(async () => {
      try {
        setAutosaving(true);
        setSaveStatus('saving');
        await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
        setSaveStatus('saved');
        // Limpa status após 2 segundos
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (error: any) {
        console.error('Erro ao salvar anotações:', error);
        setSaveStatus('error');
        // Limpa status de erro após 5 segundos
        setTimeout(() => setSaveStatus(null), 5000);
      } finally { 
        setAutosaving(false); 
      }
    }, 500);
    
    const safety = setTimeout(async () => {
      try {
        setAutosaving(true);
        setSaveStatus('saving');
        await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (error: any) {
        console.error('Erro ao salvar anotações (timer de segurança):', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 5000);
      } finally { 
        setAutosaving(false); 
      }
    }, 15000);
    
    return () => { clearTimeout(debounce); clearTimeout(safety); };
  }, [dirty, essay, annotations, richAnnos, useNewAnnotator]);

  // carregar PDF via iframe viewer
  useEffect(() => {
    if (!id || !useIframe) return;
    setPdfReady(false);
    setIframeError(null);
    
    (async () => {
      try {
        // 1) buscar token curto
        const { data: tok } = await api.get(`/essays/${id}/file-token`);
        const fileUrl = `${api.defaults.baseURL}/essays/${id}/file`;
        
        // 2) validar com HEAD request
        try {
          await api.head(`/essays/${id}/file`, {
            headers: { Authorization: `Bearer ${tok.token}` }
          });
        } catch (headError: any) {
          if (headError.response?.status === 401) {
            setIframeError('Acesso negado ao arquivo PDF');
            return;
          } else if (headError.response?.status === 404) {
            setIframeError('Arquivo PDF não encontrado');
            return;
          } else {
            setIframeError('Erro ao validar arquivo PDF');
            return;
          }
        }
        
        setFileBase(fileUrl);
        setFileToken(tok?.token);
        setPdfReady(true);
      } catch (error: any) {
        if (error.response?.status === 401) {
          setIframeError('Acesso negado - faça login novamente');
        } else if (error.response?.status === 404) {
          setIframeError('Redação não encontrada');
        } else {
          setIframeError('Falha ao carregar PDF');
        }
      }
    })();
  }, [id, useIframe]);


  function sendFileToIframe() {
    if (!iframeRef.current || !fileBase || !fileToken) return;
    // 2) mandar pro iframe
    iframeRef.current.contentWindow?.postMessage({
      type: "open",
      payload: { url: fileBase, token: fileToken }
    }, "*");
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


  async function submit(generatePdf=false) {
    if (!essay) return;
    try {
      setLoading(true);
  await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
      if (essay.type === 'ENEM') {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'ENEM',
          weight: Number(weight)||1,
          annulmentReason: effectiveAnnul || undefined,
          countInBimestral,
          bimestralPointsValue: Number(bimestralValue)||0,
          enemCompetencies: { c1: Number(c1), c2: Number(c2), c3: Number(c3), c4: Number(c4), c5: Number(c5) },
          comments,
        });
      } else {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'PAS',
          weight: Number(weight)||1,
          annulmentReason: effectiveAnnul || undefined,
          countInBimestral,
          bimestralPointsValue: Number(bimestralValue)||0,
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
  setSnapshot({ annotations, comments, weight, bimestralPointsValue: bimestralValue, countInBimestral, annulmentReason: effectiveAnnul, c1, c2, c3, c4, c5, NC, NL });
      navigate('/professor/redacao');
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally { setLoading(false); }
  }

  if (loading && !essay) return <div className="p-6">Carregando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!essay) return null;

  async function openPdfInNewTab() {
    if (!id) return;
    try {
      // 3) "Abrir em nova aba" (fallback)
      if (fileToken && fileBase) {
        window.open(`${fileBase}?t=${fileToken}`, "_blank", "noopener");
        return;
      }
      
      // Fallback: blob
      const res = await api.get(`/essays/${id}/file`, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error('openPdfInNewTab error', e);
      alert('Não foi possível abrir o arquivo.');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {import.meta.env.DEV && (
        <div className="text-xs text-ys-ink-2">Flag rich: {String((window as any).YS_USE_RICH_ANNOS)} • mime: {essay.originalMimeType || '-'}</div>
      )}
  <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            src={essay.studentId?.photo}
            name={essay.studentId?.name}
            className="h-16 w-16"
          />
          <div>
            <h2 className="text-lg font-semibold">{essay.studentId?.name || '-'}</h2>
            <p className="text-sm text-ys-ink-2">
              {essay.classId ? `${essay.classId.series || ''}${essay.classId.letter || ''}` : '-'}
              {essay.studentId?.rollNumber != null ? ` • Nº ${essay.studentId.rollNumber}` : ''}
            </p>
            <p className="text-sm text-ys-ink-2">Tema: {essay.customTheme || essay.theme?.name || '-'}</p>
            <p className="text-sm text-ys-ink-2">Modelo: {essay.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              Não salvo
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Salvando…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Salvo
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Erro ao salvar
            </span>
          )}
          {!saveStatus && !dirty && lastSavedAt && (
            <span className="mr-2 text-xs text-ys-ink-2">Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <button className="rounded-lg border border-[#E5E7EB] px-3 py-1.5" onClick={()=>navigate('/professor/redacao')}>Voltar</button>
          {import.meta.env.DEV && (
            <div className="ml-2 flex items-center gap-1 text-xs text-ys-ink-2">
              <span>Annotator:</span>
              <select
                className="rounded border p-1"
                value={forceAnnotator || 'auto'}
                onChange={(e)=> setForceAnnotator(e.target.value as any)}
              >
                <option value="auto">auto</option>
                <option value="rich">rich</option>
                <option value="legacy">legacy</option>
              </select>
            </div>
          )}
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-60" disabled={loading} onClick={()=>submit(false)}>
              {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent" />}
              <span>Salvar</span>
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-white disabled:opacity-60" disabled={loading} onClick={()=>submit(true)}>
              {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />}
              <span>Gerar PDF corrigido</span>
            </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-h-[420px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
          {/* Status */}
          {useIframe ? (
            pdfReady && !iframeError ? (
              <iframe
                ref={iframeRef}
                src="/viewer/index.html"
                className="w-full border-0"
                onLoad={sendFileToIframe}
              />
            ) : (
              <div className="p-4 text-sm text-ys-ink-2">
                {iframeError || pdfError || 'Carregando PDF…'}
                {id && (
                  <button className="ml-2 underline" onClick={openPdfInNewTab}>Abrir em nova aba</button>
                )}
              </div>
            )
          ) : (
            <div className="p-4 text-sm text-ys-ink-2">Visualização de PDF desativada</div>
          )}
        </div>
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-[#111827]">Peso</label>
                <input value={weight} onChange={(e)=>setWeight(e.target.value)} type="number" min={0} max={10} className="w-full rounded border p-2" disabled={!countInBimestral} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827]">Valor bimestral</label>
                <input value={bimestralValue} onChange={(e)=>setBimestralValue(e.target.value)} type="number" min={0} className="w-full rounded border p-2" disabled={!countInBimestral} />
              </div>
              <label className="inline-flex items-center gap-2 mt-6 text-sm text-[#111827]"><input type="checkbox" checked={countInBimestral} onChange={(e)=>setCountInBimestral(e.target.checked)} /> Contar no bimestre</label>
              <div className="mt-6">
                <label className="block text-sm font-medium text-[#111827]">Anular</label>
                <select className="rounded border p-2 text-sm" value={annulReason} onChange={e=>setAnnulReason(e.target.value)}>
                <option value="">—</option>
                <option value="Menos de 7 linhas">Menos de 7 linhas</option>
                <option value="Fuga ao tema">Fuga ao tema</option>
                <option value="Cópia">Cópia</option>
                <option value="Letra ilegível">Letra ilegível</option>
                <option value="Identificação">Identificação</option>
                <option value="Parte desconectada">Parte desconectada</option>
                <option value="Outros">Outros</option>
                </select>
                {annulReason === 'Outros' && (
                  <input
                    type="text"
                    value={annulOther}
                    onChange={(e) => setAnnulOther(e.target.value)}
                    className="mt-2 w-full rounded border p-2 text-sm"
                    placeholder="Motivo"
                  />
                )}
              </div>
            </div>

          {essay.type === 'ENEM' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#111827]">Competências ENEM</label>
              <div className="grid grid-cols-5 gap-2">
                {[{v:c1,s:setC1},{v:c2,s:setC2},{v:c3,s:setC3},{v:c4,s:setC4},{v:c5,s:setC5}].map((o,i)=> (
                  <select key={i} value={o.v} onChange={e=> o.s(e.target.value)} className="rounded border p-2">
                    {[0,40,80,120,160,200].map(n=> <option key={n} value={n}>{n}</option>)}
                  </select>
                ))}
              </div>
              <p className="text-sm text-ys-ink-2">
                Total ENEM: <span className="font-medium text-[#111827]">{effectiveAnnul ? 0 : enemPreview.total}</span> / 1000 {effectiveAnnul && '(anulada)'}
              </p>
              {countInBimestral && (
                <p className="text-sm text-ys-ink-2">
                  Prévia bimestral: <span className="font-medium text-[#111827]">{(enemPreview.bimestral ?? 0).toFixed(1)}</span> / {bimestralValue}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NC (0–10)</label>
                  <input type="number" min={0} max={10} value={NC} onChange={e=> setNC(e.target.value)} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NL (≥1)</label>
                  <input type="number" min={1} value={NL} onChange={e=> setNL(e.target.value)} className="w-full rounded border p-2" />
                </div>
              </div>
              <p className="text-sm text-ys-ink-2">NE (auto): <span className="font-medium text-[#111827]">{neCount}</span></p>
              <p className="text-sm text-ys-ink-2">
                NR = NC - 2 * NE / NL = {Number(NC) || 0} - 2 * {neCount} / {Number(NL) || 1} =
                <span className="font-medium text-[#111827]"> {effectiveAnnul ? 0 : nr.toFixed(2)}</span>
                {effectiveAnnul && ' (anulada)'}
              </p>
              {countInBimestral && (
                <p className="text-sm text-ys-ink-2">
                  Prévia bimestral: <span className="font-medium text-[#111827]">{(pasBimestral ?? 0).toFixed(1)}</span> / {bimestralValue}
                </p>
              )}
            </div>
          )}

          <label className="block text-sm font-medium text-[#111827]">Comentários</label>
          <textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="h-28 w-full rounded border p-2" placeholder="Feedback opcional" />

          {useNewAnnotator ? (
            <AnnotationEditorRich
              value={richAnnos}
              onChange={setRichAnnos}
              currentPage={currentPage}
              onSelect={(id)=>{
                if (!id) { setSelectedIndex(null); return; }
                const idx = richAnnos.findIndex(a=> a.id===id);
                if (idx>=0) {
                  setSelectedIndex(idx);
                  const p = richAnnos[idx]?.page; if (typeof p === 'number') setCurrentPage(p);
                }
              }}
              selectedId={selectedIndex!=null ? richAnnos[selectedIndex]?.id || null : null}
              onJump={(p)=> setCurrentPage(p)}
            />
          ) : (
            <AnnotationEditor
              value={annotations}
              onChange={setAnnotations}
              focusIndex={lastAddedIndex}
              selectedIndex={selectedIndex}
              currentPage={currentPage}
              onSelect={(i)=>{ setSelectedIndex(i); const p = (annotations[i] as any)?.bbox?.page; if (typeof p === 'number') setCurrentPage(p+1); }}
              onRemove={(idx)=>{
                setAnnotations((prev) => {
                  const ann = prev[idx];
                  setUndoStack((s)=> [{ idx, ann }, ...s].slice(0, 20));
                  return prev.filter((_, i) => i !== idx);
                });
                if (selectedIndex === idx) setSelectedIndex(null);
              }}
            />
          )}
          {undoStack.length > 0 && (
            <div className="text-xs text-ys-ink-2">
              Anotação removida. <button className="underline" onClick={()=>{
                const last = undoStack[0];
                setUndoStack((s)=> s.slice(1));
                setAnnotations((prev)=> {
                  const next = prev.slice();
                  const insertAt = Math.min(last.idx, next.length);
                  next.splice(insertAt, 0, last.ann);
                  return next;
                });
                setSelectedIndex((prevSel)=> Math.min(last.idx, (annotations.length)));
              }}>Desfazer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

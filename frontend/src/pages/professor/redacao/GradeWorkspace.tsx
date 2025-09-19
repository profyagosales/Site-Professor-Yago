import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pasPreviewFrom } from '@/utils/pas';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEssayById, gradeEssay, saveAnnotations, renderCorrection } from '@/services/essays.service';
import AnnotationEditor from '@/components/redacao/AnnotationEditor';
import AnnotationEditorRich from '@/components/redacao/AnnotationEditorRich';
import type { Highlight } from '@/components/redacao/types';
import type { Anno } from '@/types/annotations';
import { toast } from 'react-toastify';
import PdfAnnotator from "@/components/redacao/PdfAnnotator";

const useRich = import.meta.env.VITE_USE_RICH_ANNOS === '1' || import.meta.env.VITE_USE_RICH_ANNOS === 'true';
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
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [pdfCheck, setPdfCheck] = useState<'unknown' | 'ok' | 'fail'>('unknown');
  const [ready, setReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);

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

  const enemTotal = useMemo(() => [c1,c2,c3,c4,c5].map(Number).reduce((a,b)=>a+(isNaN(b)?0:b),0), [c1,c2,c3,c4,c5]);
  const [forceAnnotator, setForceAnnotator] = useState<null | 'rich' | 'legacy'>(null);
  const useNewAnnotator = forceAnnotator ? forceAnnotator === 'rich' : Boolean((window as any).YS_USE_RICH_ANNOS);
  const pasPreview = useMemo(() => {
    if (!countInBimestral) return { raw: 0, scaled: 0 } as any;
    const w = Number(weight) || 1;
    const nc = Number(NC);
    const nl = Number(NL);
    if ([nc, nl, w].some(Number.isNaN)) return { raw: 0, scaled: 0 } as any;
    const { raw, scaled } = pasPreviewFrom({ NC: nc, NL: Math.max(1, nl), annotations, weight: w });
    return { raw, scaled } as any;
  }, [NC, NL, annotations, weight, countInBimestral]);
  const neCount = useMemo(() => annotations.filter(a => a.color === 'grammar' && (a.label||'').toLowerCase().includes('erro')).length, [annotations]);


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

  // Autosave: debounce rápido e timer de segurança
  useEffect(() => {
    if (!dirty || !essay) return;
    const debounce = setTimeout(async () => {
      try {
        setAutosaving(true);
    await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
      } catch {}
      finally { setAutosaving(false); }
    }, 1200);
    const safety = setTimeout(async () => {
      try {
        setAutosaving(true);
    await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
      } catch {}
      finally { setAutosaving(false); }
    }, 15000);
    return () => { clearTimeout(debounce); clearTimeout(safety); };
  }, [dirty, essay, annotations, richAnnos, useNewAnnotator]);

  // obter token curto para o viewer em iframe
  useEffect(() => {
    if (!id || !useIframe) return;
    (async () => {
      try {
        const res = await fetch('/api/file-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ essayId: id }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('token');
        const { token } = await res.json();
        setFileUrl(`/api/essays/${id}/file?token=${token}`);
      } catch (e) {
        setIframeError('Falha ao carregar PDF');
      }
    })();
  }, [id, useIframe]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.type === 'height' && iframeRef.current) {
        iframeRef.current.style.height = `${msg.value}px`;
      } else if (msg?.type === 'loaded') {
        setReady(true);
      } else if (msg?.type === 'annos-changed') {
        setAnnotations(msg.payload || []);
      } else if (msg?.type === 'error') {
        setIframeError(msg.message || 'Erro');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function handleIframeLoad() {
    if (!iframeRef.current || !fileUrl) return;
    iframeRef.current.contentWindow?.postMessage(
      { type: 'open', fileUrl, meta: { essayId: id, commentsRequired: true } },
      window.location.origin,
    );
  }

  const isPdf = contentType ? contentType.toLowerCase().includes('pdf') : false;
  const effectiveSrc = viewerUrl || '';
  const canRenderInline = pdfCheck === 'ok' && !!viewerUrl;

  async function submit(generatePdf=false) {
    if (!essay) return;
    try {
      setLoading(true);
  await saveAnnotations(essay._id || essay.id, annotations as any, { annos: useNewAnnotator ? richAnnos : undefined });
      if (essay.type === 'ENEM') {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'ENEM',
          weight: Number(weight)||1,
          annulmentReason: annulReason || undefined,
          countInBimestral,
          bimestralPointsValue: Number(bimestralValue)||0,
          enemCompetencies: { c1: Number(c1), c2: Number(c2), c3: Number(c3), c4: Number(c4), c5: Number(c5) },
          comments,
        });
      } else {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'PAS',
          weight: Number(weight)||1,
          annulmentReason: annulReason || undefined,
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
  setSnapshot({ annotations, comments, weight, bimestralPointsValue: bimestralValue, countInBimestral, annulmentReason: annulReason, c1, c2, c3, c4, c5, NC, NL });
      navigate('/professor/redacao');
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally { setLoading(false); }
  }

  if (loading && !essay) return <div className="p-6">Carregando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!essay) return null;

  async function openPdfInNewTab() {
    if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {import.meta.env.DEV && (
        <div className="text-xs text-ys-ink-2">Flag rich: {String((window as any).YS_USE_RICH_ANNOS)} • isPdf: {String(isPdf)} • mime: {essay.originalMimeType || '-'}</div>
      )}
  <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {essay.studentId?.photo ? (
            <img src={essay.studentId.photo} alt={essay.studentId.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280]">
              {(essay.studentId?.name || 'A').slice(0,1)}
            </div>
          )}
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
          {!dirty && autosaving && (
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[#374151]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent" />
              Salvando…
            </span>
          )}
          {!dirty && lastSavedAt && (
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="min-h-[420px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
          {/* PDF inline obrigatório */}
          {fileUrl ? (
            <PdfAnnotator
              fileSrc={fileUrl}
              essayId={(essay as any)._id || (essay as any).id}
              palette={[
                { key:'apresentacao', label:'Apresentação',          color:'#f97316', rgba:'rgba(249,115,22,0.60)' },
                { key:'ortografia',   label:'Ortografia/gramática',  color:'#22c55e', rgba:'rgba(34,197,94,0.60)'  },
                { key:'argumentacao', label:'Argumentação/estrutura',color:'#eab308', rgba:'rgba(234,179,8,0.60)'  },
                { key:'comentario',   label:'Comentário geral',      color:'#ef4444', rgba:'rgba(239,68,68,0.60)'  },
                { key:'coesao',       label:'Coesão/coerência',      color:'#0ea5e9', rgba:'rgba(14,165,233,0.60)' },
              ]}
              onChange={(list)=> setRichAnnos(list as any)}
            />
          ) : (
            <div className="p-4 text-sm text-ys-ink-2">Carregando PDF…</div>
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
                <option value="Ilegível/sem identificação">Ilegível/sem identificação</option>
                <option value="Outros">Outros</option>
              </select>
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
              <p className="text-sm text-ys-ink-2">Total ENEM: <span className="font-medium text-[#111827]">{enemTotal}</span> / 1000 {annulReason && '(anulada)'}</p>
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
              <p className="text-sm text-ys-ink-2">Prévia PAS: nota <span className="font-medium text-[#111827]">{pasPreview.raw}</span>/10 • bimestral <span className="font-medium text-[#111827]">{pasPreview.scaled}</span> / {weight} • NE: <span className="font-medium text-[#111827]">{neCount}</span></p>
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

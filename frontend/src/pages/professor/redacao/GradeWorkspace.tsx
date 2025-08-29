import { useEffect, useMemo, useState } from 'react';
import { Document, pdfjs } from 'react-pdf';
import { getToken } from '@/utils/auth';
import { pasPreviewFrom } from '@/utils/pas';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEssayById, gradeEssay, saveAnnotations, renderCorrection } from '@/services/essays.service';
import AnnotationEditor from '@/components/redacao/AnnotationEditor';
import AnnotationEditorRich from '@/components/redacao/AnnotationEditorRich';
import PdfHighlighter from '@/components/redacao/PdfHighlighter';
import PdfAnnotator from '@/components/redacao/PdfAnnotator';
import PdfViewer from '@/components/redacao/PdfViewer';
import type { Anno } from '@/types/annotations';
import type { Annotation } from '@/types/redacao';
import { toast } from 'react-toastify';

export default function GradeWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [essay, setEssay] = useState<any | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [richAnnos, setRichAnnos] = useState<Anno[]>([]);
  const [comments, setComments] = useState('');
  const [weight, setWeight] = useState('1');
  const [annul, setAnnul] = useState(false);
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
  const [undoStack, setUndoStack] = useState<Array<{ idx: number; ann: Annotation }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ idx: number; ann: Annotation }>>([]);
  const [thumbs, setThumbs] = useState<'1'|'2'>('2');
  const [dirty, setDirty] = useState(false);
  const [suppressDirty, setSuppressDirty] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [snapshot, setSnapshot] = useState<null | {
    annotations: Annotation[];
    comments: string;
    weight: string;
    annul: boolean;
    c1: string; c2: string; c3: string; c4: string; c5: string;
    NC: string; NL: string;
  }>(null);
  // Resolução do src do PDF: faz preflight HEAD e tenta fallback com ?token em caso de 401
  const [pdfCheck, setPdfCheck] = useState<'unknown'|'ok'|'fail'>('unknown');
  const [srcOk, setSrcOk] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [forceInline, setForceInline] = useState(false);
  useEffect(() => {
    setPdfCheck('unknown');
    setSrcOk(null);
    setContentType(null);
    setForceInline(false);
  }, [essay?.originalUrl, essay?.fileUrl]);

  // Configura worker do PDF de forma segura (efeito) para evitar efeitos colaterais no render
  useEffect(() => {
    try {
      // @ts-ignore
      const workerSrc = (() => {
        try {
          // eslint-disable-next-line no-new-func
          const base = (new Function('try { return import.meta.url } catch { return null }'))();
          if (base) return new URL('pdfjs-dist/build/pdf.worker.min.mjs', base).toString();
        } catch {}
        return null;
      })();
      if (workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await fetchEssayById(id);
        if (!alive) return;
    setEssay(data);
  if (data?.annotations) setAnnotations(data.annotations);
  if (data?.richAnnotations) setRichAnnos(data.richAnnotations);
  if (data?.comments) setComments(data.comments);
  if (data?.bimestreWeight) setWeight(String(data.bimestreWeight));
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
        setAnnul(Boolean(data?.annulmentReason));
        // initialize snapshot and clear dirty tracking
        const snap = {
          annotations: data?.annotations || [],
          comments: data?.comments || '',
          weight: String(data?.bimestreWeight || '1'),
          annul: Boolean(data?.annulmentReason),
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
    const w = Number(weight) || 1;
    const nc = Number(NC);
    const nl = Number(NL);
    if ([nc, nl, w].some(Number.isNaN)) return { raw: 0, scaled: 0 } as any;
    const { raw, scaled } = pasPreviewFrom({ NC: nc, NL: Math.max(1, nl), annotations, weight: w });
    return { raw, scaled } as any;
  }, [NC, NL, annotations, weight]);
  const neCount = useMemo(() => annotations.filter(a => a.color === 'green' && (a.label||'').toLowerCase().includes('erro')).length, [annotations]);

  // Mark form dirty on relevant changes
  useEffect(() => { if (!loading && !suppressDirty) setDirty(true); }, [annotations, comments, c1, c2, c3, c4, c5, NC, NL, weight, annul, loading, suppressDirty]);
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
    await saveAnnotations(essay._id || essay.id, annotations, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
      } catch {}
      finally { setAutosaving(false); }
    }, 1200);
    const safety = setTimeout(async () => {
      try {
        setAutosaving(true);
    await saveAnnotations(essay._id || essay.id, annotations, { annos: useNewAnnotator ? richAnnos : undefined });
        setLastSavedAt(new Date());
      } catch {}
      finally { setAutosaving(false); }
    }, 15000);
    return () => { clearTimeout(debounce); clearTimeout(safety); };
  }, [dirty, essay, annotations, richAnnos, useNewAnnotator]);

  // --- Cálculo de URLs do PDF e preflight (precisa ficar ANTES de qualquer return condicional) ---
  const isPdfByExt = useMemo(() => (essay?.originalUrl || essay?.fileUrl || essay?.correctedUrl || '')
    .toLowerCase().includes('.pdf'), [essay?.originalUrl, essay?.fileUrl, essay?.correctedUrl]);
  const isPdfByMime = useMemo(() => typeof essay?.originalMimeType === 'string' && essay!.originalMimeType.toLowerCase().includes('pdf'), [essay?.originalMimeType]);
  const isPdf = isPdfByExt || isPdfByMime || (contentType ? contentType.toLowerCase().includes('pdf') : false);
  const idStr = (essay as any)?._id || (essay as any)?.id;
  const RAW_API_URL = ((import.meta as any).env?.VITE_API_URL || '').toString();
  const base = RAW_API_URL.replace(/\/$/, '');
  const proxied = useMemo(() => {
    if (!idStr) return null;
    try {
      const baseOrigin = base ? new URL(base).origin : '';
      const here = typeof window !== 'undefined' ? window.location.origin : '';
      return baseOrigin && here && baseOrigin !== here
        ? `/api/essays/${idStr}/file`
        : (base ? `${base}/api/essays/${idStr}/file` : `/api/essays/${idStr}/file`);
    } catch {
      return `/api/essays/${idStr}/file`;
    }
  }, [idStr, base]);
  const direct = essay?.originalUrl || essay?.fileUrl || essay?.correctedUrl;
  const _t = getToken();
  const authHeader = _t ? { Authorization: `Bearer ${_t}` } : undefined;
  const srcUrl = proxied || direct || null;

  // Preflight HEAD: tenta sem token; se 401, tenta com ?token=
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!proxied) { setPdfCheck('fail'); setSrcOk(null); return; }
      setPdfCheck('unknown');
      try {
        const r = await fetch(proxied, { method: 'HEAD', headers: authHeader as any, credentials: 'include' });
        if (!cancelled && r.ok) {
          const ct = r.headers.get('content-type');
          if (ct) setContentType(ct);
          setSrcOk(proxied);
          setPdfCheck('ok');
          return;
        }
  // Em 5xx no proxy, não trocamos para URL direta automaticamente (pode ser protegida e gerar 401);
  // seguimos de forma otimista com o próprio proxy no GET real
        // Se não for 401, ainda assim tentamos renderizar (falhas de HEAD/502/405 não impedem GET real)
        if (!cancelled && r.status !== 401) {
          const ct = r.headers.get('content-type');
          if (ct) setContentType(ct);
          setSrcOk(proxied);
          setPdfCheck('ok');
          return;
        }
        if (!cancelled && r.status === 401 && _t) {
          const u = new URL(proxied, typeof window !== 'undefined' ? window.location.origin : 'http://local');
          if (!u.searchParams.get('token')) u.searchParams.set('token', _t);
          const tokenUrl = u.pathname + u.search;
          const r2 = await fetch(tokenUrl, { method: 'HEAD', credentials: 'include' });
          if (!cancelled && r2.ok) {
            const ct2 = r2.headers.get('content-type');
            if (ct2) setContentType(ct2);
            setSrcOk(tokenUrl);
            setPdfCheck('ok');
            return;
          }
          // Em 5xx com token, ainda assim não alternamos para direto automaticamente
          // Mesmo após 401, tenta inline com token por via das dúvidas
          if (!cancelled) { setSrcOk(tokenUrl); setPdfCheck('ok'); return; }
        }
      } catch {}
      // Em falha de rede do HEAD, ainda tentamos inline
      if (!cancelled) { setSrcOk(proxied); setPdfCheck('ok'); }
    })();
    return () => { cancelled = true; };
  }, [proxied, _t]);

  async function submit(finalizePdf=false, sendEmail=false) {
    if (!essay) return;
    try {
      setLoading(true);
  await saveAnnotations(essay._id || essay.id, annotations, { annos: useNewAnnotator ? richAnnos : undefined });
      if (essay.type === 'ENEM') {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'ENEM',
          weight: Number(weight)||1,
          annul,
          enemCompetencies: { c1: Number(c1), c2: Number(c2), c3: Number(c3), c4: Number(c4), c5: Number(c5) },
          comments,
        });
      } else {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'PAS',
          weight: Number(weight)||1,
          annul,
          pas: { NC: Number(NC), NL: Number(NL) },
          comments,
        });
      }
      if (finalizePdf) {
        await renderCorrection(essay._id || essay.id, { sendEmail, thumbnailsCount: Number(thumbs) });
      }
  toast.success('Correção salva');
  setDirty(false);
  setLastSavedAt(new Date());
  setSnapshot({ annotations, comments, weight, annul, c1, c2, c3, c4, c5, NC, NL });
      navigate('/professor/redacao');
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally { setLoading(false); }
  }

  if (loading && !essay) return <div className="p-6">Carregando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!essay) return null;
    // Render inline quando o preflight confirmar OK, ou quando usuário forçar.
    const canRenderInline = (pdfCheck === 'ok' && !!(srcOk || srcUrl)) || forceInline;
    const effectiveSrc = (srcOk || srcUrl) || '';

  async function openPdfInNewTab() {
    // Tenta primeiro via proxy autenticado (relative /api/...)
    const proxyUrl = `/api/essays/${idStr}/file`;
    try {
      const res = await fetch(proxyUrl, { headers: authHeader as any });
      if (!res.ok) throw new Error('fetch-fail');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // limpa depois de um tempo
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    } catch {
      // Fallback para URL direta (pode exigir que o arquivo seja público)
      if (direct) window.open(direct, '_blank', 'noopener,noreferrer');
      else if (srcUrl) window.open(srcUrl, '_blank', 'noopener,noreferrer');
    }
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
          {snapshot && (
            <button
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-60"
              disabled={loading || !dirty}
              onClick={() => {
                if (!snapshot) return;
                setSuppressDirty(true);
                setAnnotations(snapshot.annotations);
                setComments(snapshot.comments);
                setWeight(snapshot.weight);
                setAnnul(snapshot.annul);
                setC1(snapshot.c1); setC2(snapshot.c2); setC3(snapshot.c3); setC4(snapshot.c4); setC5(snapshot.c5);
                setNC(snapshot.NC); setNL(snapshot.NL);
                setDirty(false);
                setTimeout(() => setSuppressDirty(false), 0);
              }}
            >Descartar alterações</button>
          )}
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-1.5 disabled:opacity-60" disabled={loading} onClick={()=>submit(false,false)}>
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-transparent" />}
            <span>Salvar</span>
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-white disabled:opacity-60" disabled={loading} onClick={()=>submit(true,false)}>
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />}
            <span>Salvar + PDF</span>
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-white disabled:opacity-60" disabled={loading} onClick={()=>submit(true,true)}>
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />}
            <span>Salvar + PDF + E-mail</span>
          </button>
          <div className="ml-2 flex items-center gap-1 text-xs text-ys-ink-2">
            <span>Miniaturas:</span>
            <select value={thumbs} onChange={(e)=>setThumbs(e.target.value as '1'|'2')} className="rounded border p-1">
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
          <div className="ml-2 flex items-center gap-1 text-xs text-ys-ink-2">
            <button title="Ir para anotação anterior" className="rounded border px-2 py-1" disabled={annotations.length === 0} onClick={()=>{
              if (annotations.length===0) return;
              const next = selectedIndex==null ? 0 : (selectedIndex - 1 + annotations.length) % annotations.length;
              setSelectedIndex(next);
              const p = (annotations[next] as any)?.bbox?.page; if (typeof p === 'number') setCurrentPage(p+1);
            }}>Anterior</button>
            <button title="Ir para próxima anotação" className="rounded border px-2 py-1" disabled={annotations.length === 0} onClick={()=>{
              if (annotations.length===0) return;
              const next = selectedIndex==null ? 0 : (selectedIndex + 1) % annotations.length;
              setSelectedIndex(next);
              const p = (annotations[next] as any)?.bbox?.page; if (typeof p === 'number') setCurrentPage(p+1);
            }}>Próxima</button>
            <span className="ml-1 text-[11px] text-ys-ink-2">
              {annotations.length > 0 ? `${(selectedIndex ?? 0) + 1} de ${annotations.length}` : '0 de 0'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="min-h-[420px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
          {/* Status */}
          {pdfCheck === 'unknown' && (
            <div className="p-4 text-sm text-ys-ink-2">Verificando arquivo…</div>
          )}
          {canRenderInline && isPdf ? (
            idStr ? <PdfViewer essayId={idStr} /> : <div className="p-4 text-sm text-ys-ink-2">Carregando…</div>
          ) : canRenderInline && !isPdf ? (
            <div className="p-4 text-sm text-[#111827] space-y-2">
              <div>O arquivo não é um PDF (Content-Type: {contentType || essay.originalMimeType || 'desconhecido'}). Exibindo visualização básica.</div>
              {/* tenta imagem; se falhar, usa iframe */}
              <img src={effectiveSrc} alt="arquivo" className="mt-2 max-h-[70vh] w-full object-contain" onError={(e)=>{
                const img = e.currentTarget; const parent = img.parentElement as HTMLElement | null; if (!parent) return;
                img.style.display = 'none';
                const iframe = document.createElement('iframe');
                iframe.title = 'arquivo';
                iframe.style.width = '100%'; iframe.style.height = '70vh'; iframe.className = 'rounded border';
                iframe.src = effectiveSrc; parent.appendChild(iframe);
              }} />
              <div className="flex gap-2">
                <button className="rounded border px-2 py-1" onClick={()=> openPdfInNewTab()}>Abrir em nova aba</button>
              </div>
            </div>
          ) : pdfCheck === 'fail' ? (
            <div className="p-4 text-sm text-red-600 space-y-2">
              <div>Falha ao verificar o arquivo.</div>
              <div className="flex gap-2">
                <button className="rounded border px-2 py-1" onClick={()=>{ setForceInline(true); setSrcOk(srcUrl); }}>Tentar carregar mesmo assim</button>
                {srcUrl && (
                  <button className="rounded border px-2 py-1" onClick={()=>{
                    const el = document.getElementById('fallback-pdf') as HTMLIFrameElement | null;
                    if (el) { el.src = srcUrl; }
                    setForceInline(false);
                  }}>Ver básico (sem anotações)</button>
                )}
              </div>
              <iframe id="fallback-pdf" title="arquivo" className="mt-2 h-[70vh] w-full rounded border" style={{ display: 'block' }} />
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Peso</label>
              <input value={weight} onChange={(e)=>setWeight(e.target.value)} type="number" min={0} max={10} className="w-full rounded border p-2" />
            </div>
            <label className="inline-flex items-center gap-2 mt-6 text-sm text-[#111827]"><input type="checkbox" checked={annul} onChange={(e)=>setAnnul(e.target.checked)} /> Anular</label>
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
              <p className="text-sm text-ys-ink-2">Total ENEM: <span className="font-medium text-[#111827]">{enemTotal}</span> / 1000 {annul && '(anulada)'}</p>
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

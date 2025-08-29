import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { Anno, AnnotationType, BoxAnno, HighlightAnno } from '@/types/annotations';
import { Document, Page, pdfjs } from 'react-pdf';
import { getToken } from '@/utils/auth';
import { computeVisibleRange } from '@/lib/virtualPages';
// Configura worker para Vite/ESM (evita import.meta direto em Jest)
try {
  // @ts-ignore
  const workerSrc = (() => {
    try {
      // evita parse de import.meta fora de ESM
      // eslint-disable-next-line no-new-func
      const base = (new Function('try { return import.meta.url } catch { return null }'))();
      if (base) return new URL('pdfjs-dist/build/pdf.worker.min.mjs', base).toString();
    } catch {}
    return null;
  })();
  if (workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
} catch {}

type Props = {
  src: string;
  // Fallback absoluto (ex.: URL direta do Cloudinary) caso o proxy /api falhe
  altSrc?: string;
  storageKey: string; // localStorage key por redação
  annos: Anno[];
  onChange: (next: Anno[]) => void;
  page?: number;
  onPageChange?: (p: number) => void;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
};

export default function PdfAnnotator({ src, altSrc, storageKey, annos, onChange, page: controlledPage, onPageChange, selectedId: controlledSel, onSelectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<AnnotationType | 'select' | 'erase'>('select');
  const [draft, setDraft] = useState<any>(null);
  const [internalSel, setInternalSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<null | { id: string; kind: 'move'|'resize'; handle?: Handle; start: {x:number;y:number}; origRect?: {x:number;y:number;w:number;h:number} }>(null);
  const [undo, setUndo] = useState<Anno[][]>([]);
  const [redo, setRedo] = useState<Anno[][]>([]);
  const [opts, setOpts] = useState({
    highlightOpacity: 0.3,
    highlightColor: '#fde047',
    penColor: '#ef4444', penWidth: 2,
    boxColor: '#3b82f6', boxWidth: 2,
    strikeColor: '#ef4444', strikeWidth: 2,
  });
  const virtMode = (window as any).YS_VIRT_PDF ?? true;
  const pageGap = 16; // px
  const [aspect, setAspect] = useState(1.414);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bufferScreens = Number((window as any).YS_VIRT_BUFFER ?? 1);
  const authHeader = useMemo(() => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  }, []);
  // reset blobUrl quando src muda e cleanup
  useEffect(() => {
    if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch {} setBlobUrl(null); }
  }, [src]);
  useEffect(() => () => { if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch {} } }, [blobUrl]);

  // mede altura do viewport do scroller ao montar
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) setViewportH(el.clientHeight || 600);
  }, []);

  // mantém a página atual visível quando zoom/aspect mudarem no modo virtual
  useEffect(() => {
    if (!virtMode) return;
    scrollToPage(page);
  }, [zoom, aspect]);

  function scrollToPage(p: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const hostW = scroller.clientWidth || 0;
    const pageW = Math.floor(hostW * zoom);
    const pageH = Math.floor(pageW * aspect);
    const top = (p - 1) * (pageH + pageGap);
    try {
      scroller.scrollTo({ top, behavior: 'smooth' });
    } catch {
      scroller.scrollTop = top;
    }
  }

  // autosave local
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ annos, page, zoom })); } catch {}
  }, [storageKey, annos, page, zoom]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.annos) && annos.length === 0) onChange(data.annos);
        if (typeof data.page === 'number') setPage(Math.max(1, data.page));
        if (typeof data.zoom === 'number') setZoom(Math.min(2, Math.max(0.5, data.zoom)));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // pagina controlada (se fornecida)
  useEffect(() => {
    if (typeof controlledPage === 'number') {
      setPage(controlledPage);
      if (virtMode) scrollToPage(controlledPage);
    }
  }, [controlledPage]);
  const pageAnnos = useMemo(() => annos.filter(a => a.page === page), [annos, page]);
  const selectedId = controlledSel ?? internalSel;
  function setSelectedId(id: string | null) { if (onSelectId) onSelectId(id); else setInternalSel(id); }

  function normPoint(e: { clientX: number; clientY: number }, forPage?: number) {
    const el = forPage ? pageRefs.current[forPage] : containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  function handleDown(e: React.MouseEvent, onPage?: number) {
    const actPage = onPage ?? page;
    const p = normPoint(e, actPage);
    if (tool === 'erase') {
      const hit = hitTest(p, actPage);
      if (hit) removeById(hit.id);
      return;
    }
  if (tool === 'select') {
      const hit = hitTest(p, actPage);
      setSelectedId(hit?.id || null);
      if (hit && (hit.type === 'box' || hit.type === 'highlight')) {
        pushUndo();
        // começar move
        const r = hit.type==='box' ? hit.rect : hit.rects[0];
        setDrag({ id: hit.id, kind: 'move', start: p, origRect: { ...r } });
      }
      return;
    }
    const now = new Date().toISOString();
    if (tool === 'highlight' || tool === 'box') {
      setDraft({ type: tool, start: p, rect: { x: p.x, y: p.y, w: 0, h: 0 }, createdAt: now, page: actPage });
    } else if (tool === 'pen') {
      setDraft({ type: 'pen', points: [p], createdAt: now, page: actPage });
    } else if (tool === 'strike') {
      setDraft({ type: 'strike', from: p, to: p, createdAt: now, page: actPage });
    } else if (tool === 'comment') {
      const id = crypto.randomUUID();
      onChange([...annos, { id, page: actPage, type: 'comment', at: p, text: '', createdAt: now }]);
    }
  }
  // throttle de mousemove com rAF para reduzir renders durante drag
  const _moveRAF = useRef<number | null>(null);
  const _lastMove = useRef<{ e: { clientX:number; clientY:number; shiftKey?: boolean }; onPage?: number } | null>(null);
  function handleMoveThrottled(e: React.MouseEvent, onPage?: number) {
    _lastMove.current = { e: { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey }, onPage };
    if (_moveRAF.current != null) return;
    _moveRAF.current = requestAnimationFrame(() => {
      const payload = _lastMove.current; _lastMove.current = null; _moveRAF.current = null;
      if (payload) handleMove(payload.e, payload.onPage);
    });
  }

  function handleMove(e: { clientX:number; clientY:number; shiftKey?: boolean }, onPage?: number) {
    const p = normPoint(e, onPage);
    if (drag) {
      const delta = { x: p.x - drag.start.x, y: p.y - drag.start.y };
      // visual feedback aplicado direto no estado de anotações durante drag
      const idx = annos.findIndex(a=> a.id === drag.id);
      if (idx >= 0) {
        const a = annos[idx];
        if (drag.kind === 'move') {
          if (a.type === 'box') {
            const base = drag.origRect!;
            const nr = snapRectEdges(boundRect({ x: base.x + delta.x, y: base.y + delta.y, w: base.w, h: base.h }));
            const next = annos.slice(); next[idx] = { ...a, rect: nr } as any; onChange(next);
          }
          if (a.type === 'highlight') {
            const base = drag.origRect!;
            const nr = snapRectEdges(boundRect({ x: base.x + delta.x, y: base.y + delta.y, w: base.w, h: base.h }));
            const next = annos.slice(); (next[idx] as HighlightAnno).rects = [nr]; onChange(next);
          }
        } else if (drag.kind === 'resize' && drag.handle) {
          if (a.type === 'box') {
            const nr = snapRectEdges(resizeFromHandle(drag.origRect!, delta, drag.handle, { keepRatio: !!e.shiftKey }));
            const next = annos.slice(); (next[idx] as any).rect = nr; onChange(next);
          }
          if (a.type === 'highlight') {
            const nr = snapRectEdges(resizeFromHandle(drag.origRect!, delta, drag.handle, { keepRatio: !!e.shiftKey }));
            const next = annos.slice(); (next[idx] as HighlightAnno).rects = [nr]; onChange(next);
          }
        }
      }
      return;
    }
  if (!draft) return;
    if (draft.type === 'pen') {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else if (draft.type === 'strike') {
      setDraft({ ...draft, to: p });
    } else if (draft.type === 'highlight' || draft.type === 'box') {
      let x = Math.min(draft.start.x, p.x);
      let y = Math.min(draft.start.y, p.y);
      let w = Math.abs(p.x - draft.start.x);
      let h = Math.abs(p.y - draft.start.y);
  if (e.shiftKey) {
        const s = Math.max(w, h);
        // manter quadrado
        if (p.x < draft.start.x) x = draft.start.x - s; else x = draft.start.x;
        if (p.y < draft.start.y) y = draft.start.y - s; else y = draft.start.y;
        w = s; h = s;
      }
      const nr = snapRectEdges(boundRect({ x, y, w, h }));
      setDraft({ ...draft, rect: nr });
    }
  }
  function handleUp() {
  if (drag) { setDrag(null); return; }
    if (!draft) return;
    const now = new Date().toISOString();
    pushUndo();
    const targetPage = draft.page ?? page;
    if (draft.type === 'pen') {
      const id = crypto.randomUUID();
      onChange([...annos, { id, page: targetPage, type: 'pen', points: draft.points, width: opts.penWidth, color: opts.penColor, createdAt: now }]);
    } else if (draft.type === 'strike') {
      const id = crypto.randomUUID();
      onChange([...annos, { id, page: targetPage, type: 'strike', from: draft.from, to: draft.to, strokeWidth: opts.strikeWidth, color: opts.strikeColor, createdAt: now }]);
    } else if (draft.type === 'highlight') {
      const id = crypto.randomUUID();
      onChange([...annos, { id, page: targetPage, type: 'highlight', rects: [draft.rect], opacity: opts.highlightOpacity, color: opts.highlightColor, createdAt: now }]);
    } else if (draft.type === 'box') {
      const id = crypto.randomUUID();
      onChange([...annos, { id, page: targetPage, type: 'box', rect: draft.rect, strokeWidth: opts.boxWidth, color: opts.boxColor, createdAt: now }]);
    }
    setDraft(null);
  }

  function removeSelected() {
    if (!selectedId) return;
    const idx = annos.findIndex(a=> a.id === selectedId);
    if (idx == null) return;
    pushUndo();
    const next = annos.slice();
    next.splice(idx, 1);
    onChange(next);
    setSelectedId(null);
  }

  function removeById(id: string) {
    const idx = annos.findIndex(a=> a.id === id);
    if (idx < 0) return;
    pushUndo();
    const next = annos.slice(); next.splice(idx,1); onChange(next);
    if (selectedId === id) setSelectedId(null);
  }

  function hitTest(p: {x:number;y:number}, pageNum: number = page) {
    // ordem simples: último desenhado por cima
    for (let i = annos.length - 1; i >= 0; i--) {
      const a = annos[i]; if (a.page !== pageNum) continue;
      if (a.type === 'box') {
        const r = a.rect; if (p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h) return a;
      }
      if (a.type === 'highlight') {
        const r = a.rects[0]; if (p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h) return a;
      }
      if (a.type === 'comment') {
        const r = {x:a.at.x-0.02,y:a.at.y-0.04,w:0.04,h:0.04};
        if (p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h) return a;
      }
      // pen/strike: aproximação por caixa envolvente simples
      if (a.type === 'strike') {
        const minx=Math.min(a.from.x,a.to.x)-0.01, maxx=Math.max(a.from.x,a.to.x)+0.01;
        const miny=Math.min(a.from.y,a.to.y)-0.01, maxy=Math.max(a.from.y,a.to.y)+0.01;
        if (p.x>=minx && p.x<=maxx && p.y>=miny && p.y<=maxy) return a;
      }
      if (a.type === 'pen') {
        for (let j=1;j<a.points.length;j++){
          const x1=a.points[j-1].x,y1=a.points[j-1].y,x2=a.points[j].x,y2=a.points[j].y;
          const minx=Math.min(x1,x2)-0.01,maxx=Math.max(x1,x2)+0.01,miny=Math.min(y1,y2)-0.01,maxy=Math.max(y1,y2)+0.01;
          if (p.x>=minx && p.x<=maxx && p.y>=miny && p.y<=maxy) return a;
        }
      }
    }
    return null;
  }

  function pushUndo() { setUndo((s)=> [annos.map(a=>({...a} as any)), ...s].slice(0,30)); setRedo([]); }
  function doUndo() { if (undo.length===0) return; const [head, ...rest] = undo; setRedo((r)=> [annos.map(a=>({...a} as any)), ...r].slice(0,30)); onChange(head); setUndo(rest); }
  function doRedo() { if (redo.length===0) return; const [head, ...rest] = redo; pushUndo(); onChange(head); setRedo(rest); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setTool('select'); setSelectedId(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); removeSelected(); }
  if (e.key === 'PageUp') { e.preventDefault(); const np = Math.max(1, page-1); setPage(np); onPageChange?.(np); if (virtMode) scrollToPage(np); }
  if (e.key === 'PageDown') { e.preventDefault(); const np = Math.min(numPages, page+1); setPage(np); onPageChange?.(np); if (virtMode) scrollToPage(np); }
      const isUndo = (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey;
      const isRedo = (e.ctrlKey||e.metaKey) && (e.key.toLowerCase()==='y' || (e.key.toLowerCase()==='z' && e.shiftKey));
      if (isUndo) { e.preventDefault(); doUndo(); }
      if (isRedo) { e.preventDefault(); doRedo(); }
      // atalhos de ferramentas
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k==='v') setTool('select');
        if (k==='h') setTool('highlight');
        if (k==='p') setTool('pen');
        if (k==='b') setTool('box');
        if (k==='s') setTool('strike');
        if (k==='c') setTool('comment');
        if (k==='e') setTool('erase');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, undo, redo, annos]);

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-white/90 p-1 shadow">
        {(['select','highlight','pen','box','strike','comment','erase'] as const).map((t) => (
          <button key={t} title={titleForTool(t)} className={`rounded px-2 py-1 text-xs ${tool===t?'bg-gray-900 text-white':'bg-white border'}`} onClick={()=> setTool(t as any)}>{t}</button>
        ))}
        <button className="rounded border px-2 py-1 text-xs" title="Desfazer" onClick={doUndo} disabled={undo.length===0}>↶</button>
        <button className="rounded border px-2 py-1 text-xs" title="Refazer" onClick={doRedo} disabled={redo.length===0}>↷</button>
        {/* Opções rápidas */}
        {tool==='highlight' && (
          <div className="ml-1 flex items-center gap-1">
            <input title="Opacidade" type="range" min={0.15} max={0.6} step={0.05} value={opts.highlightOpacity} onChange={(e)=> setOpts(o=>({...o, highlightOpacity: Number(e.target.value)}))} />
            <input title="Cor" type="color" value={opts.highlightColor} onChange={(e)=> setOpts(o=>({...o, highlightColor: e.target.value}))} />
          </div>
        )}
        {tool==='pen' && (
          <div className="ml-1 flex items-center gap-1">
            <input title="Largura" type="range" min={1} max={8} step={1} value={opts.penWidth} onChange={(e)=> setOpts(o=>({...o, penWidth: Number(e.target.value)}))} />
            <input title="Cor" type="color" value={opts.penColor} onChange={(e)=> setOpts(o=>({...o, penColor: e.target.value}))} />
          </div>
        )}
        {tool==='box' && (
          <div className="ml-1 flex items-center gap-1">
            <input title="Espessura" type="range" min={1} max={6} step={1} value={opts.boxWidth} onChange={(e)=> setOpts(o=>({...o, boxWidth: Number(e.target.value)}))} />
            <input title="Cor" type="color" value={opts.boxColor} onChange={(e)=> setOpts(o=>({...o, boxColor: e.target.value}))} />
          </div>
        )}
        {tool==='strike' && (
          <div className="ml-1 flex items-center gap-1">
            <input title="Espessura" type="range" min={1} max={6} step={1} value={opts.strikeWidth} onChange={(e)=> setOpts(o=>({...o, strikeWidth: Number(e.target.value)}))} />
            <input title="Cor" type="color" value={opts.strikeColor} onChange={(e)=> setOpts(o=>({...o, strikeColor: e.target.value}))} />
          </div>
        )}
      </div>

      {/* Viewer */}
      <div>
        <div className="flex items-center justify-between p-2 text-xs text-ys-ink-2">
          <div className="flex items-center gap-2">
            <button className="rounded border px-2 py-0.5" onClick={()=> { const np = Math.max(1, page-1); setPage(np); onPageChange?.(np); if (virtMode) scrollToPage(np); }} disabled={page<=1}>◀</button>
            <span>página {page} de {numPages}</span>
            <button className="rounded border px-2 py-0.5" onClick={()=> { const np = Math.min(numPages, page+1); setPage(np); onPageChange?.(np); if (virtMode) scrollToPage(np); }} disabled={page>=numPages}>▶</button>
          </div>
          <div className="flex items-center gap-1">
            <button className="rounded border px-2 py-0.5" onClick={()=> setZoom(z=> Math.max(0.5, Math.round((z-0.1)*10)/10))}>-</button>
            <span className="min-w-[3ch] text-center">{Math.round(zoom*100)}%</span>
            <button className="rounded border px-2 py-0.5" onClick={()=> setZoom(z=> Math.min(2, Math.round((z+0.1)*10)/10))}>+</button>
            <button className="rounded border px-2 py-0.5" onClick={()=> setZoom(1)}>100%</button>
          </div>
        </div>
        {virtMode ? (
          <div className="relative mx-auto w-full max-w-full overflow-hidden" style={{ minHeight: 420 }}>
            <Document
              file={(blobUrl || { url: src, httpHeaders: authHeader, withCredentials: true }) as any}
              onLoadSuccess={(d:any)=> setNumPages(d.numPages||1)}
              onLoadError={async (err: any) => {
                try {
                  const res = await fetch(src, { headers: authHeader as any, credentials: 'include' });
                  if (!res.ok) throw new Error('blob-fetch-failed');
                  const b = await res.blob();
                  const url = URL.createObjectURL(b);
                  setBlobUrl(url);
                } catch (e) {
                  try {
                    if (altSrc && altSrc !== src) {
                      const r2 = await fetch(altSrc);
                      if (!r2.ok) throw new Error('alt-fetch-failed');
                      const b2 = await r2.blob();
                      const u2 = URL.createObjectURL(b2);
                      setBlobUrl(u2);
                      return;
                    }
                  } catch {}
                  console.error(err);
                }
              }}
            >
              <div
                ref={scrollerRef}
                className="relative h-[70vh] overflow-auto"
                onScroll={(e)=>{
                  const el = e.currentTarget as HTMLDivElement;
                  (scrollerRef as any)._scrollLast = el;
                  if ((scrollerRef as any)._scrollRAF) return;
                  (scrollerRef as any)._scrollRAF = requestAnimationFrame(() => {
                    const target = (scrollerRef as any)._scrollLast as HTMLDivElement | undefined;
                    (scrollerRef as any)._scrollRAF = null;
                    if (!target) return;
                    setScrollTop(target.scrollTop);
                    setViewportH(target.clientHeight);
                  });
                }}
              >
                <VirtualPages
                  numPages={numPages}
                  zoom={zoom}
                  aspect={aspect}
                  pageGap={pageGap}
                  scrollTop={scrollTop}
                  viewportH={viewportH}
                  bufferPx={viewportH * bufferScreens}
                  onPageView={(p)=> { setPage(p); onPageChange?.(p); }}
                  setPageRef={(p, el)=> { pageRefs.current[p] = el; }}
                  renderPage={(p, width)=> (
                    <Page pageNumber={p} width={width} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(pg:any)=> { try { const v = pg.getViewport({ scale: 1 }); setAspect(v.height / v.width); } catch {} }} />
                  )}
                  renderOverlay={(p)=> (
                    <div data-testid={`overlay-page-${p}`} className="absolute left-0 top-0 z-10 h-full w-full" onMouseDown={(e)=> handleDown(e, p)} onMouseMove={(e)=> handleMoveThrottled(e, p)} onMouseUp={handleUp} onMouseLeave={handleUp}>
                      {annos.filter(a=> a.page===p).map((a) => {
                        if (a.type === 'highlight') {
                          return a.rects.map((r, i) => (
                            <div key={a.id+':'+i} onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault(); setSelectedId(a.id); if (tool==='select') { const p2=normPoint(e, p); pushUndo(); setDrag({ id:a.id, kind:'move', start: p2, origRect: { ...r } }); } }} style={{ position: 'absolute', left: `${r.x*100}%`, top: `${r.y*100}%`, width: `${r.w*100}%`, height: `${r.h*100}%`, background: toHexA((a.color||'#fde047'), (a.opacity ?? opts.highlightOpacity)), outline: selectedId===a.id?'2px solid #111827':'none', cursor: tool==='select'?'move':'crosshair' }} >
                              {selectedId===a.id && tool==='select' && (
                                <Handles rect={r} onStart={(handle, ev)=>{ ev.stopPropagation(); ev.preventDefault(); const p2=normPoint(ev as any, p); pushUndo(); setDrag({ id:a.id, kind:'resize', handle, start: p2, origRect: { ...r } }); }} />
                              )}
                            </div>
                          ));
                        }
                        if (a.type === 'box') {
                          const r = a.rect;
                          return <div key={a.id} onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault(); setSelectedId(a.id); if (tool==='select') { const p2=normPoint(e, p); pushUndo(); setDrag({ id:a.id, kind:'move', start: p2, origRect: { ...r } }); } }} style={{ position: 'absolute', left: `${r.x*100}%`, top: `${r.y*100}%`, width: `${r.w*100}%`, height: `${r.h*100}%`, border: `${a.strokeWidth||2}px solid ${a.color||'#3b82f6'}`, boxSizing: 'border-box', outline: selectedId===a.id?'2px solid #111827':'none', cursor: tool==='select'?'move':'crosshair' }} >
                            {selectedId===a.id && tool==='select' && (
                              <Handles rect={r} onStart={(handle, ev)=>{ ev.stopPropagation(); ev.preventDefault(); const p2=normPoint(ev as any, p); pushUndo(); setDrag({ id:a.id, kind:'resize', handle, start: p2, origRect: { ...r } }); }} />
                            )}
                          </div>
                        }
                        if (a.type === 'strike') {
                          const x1 = a.from.x*100, y1 = a.from.y*100, x2 = a.to.x*100, y2 = a.to.y*100;
                          const dx = x2-x1, dy = y2-y1; const len = Math.sqrt(dx*dx+dy*dy);
                          const angle = Math.atan2(dy, dx) * 180/Math.PI;
                          return <div key={a.id} onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }} style={{ position: 'absolute', left: `${x1}%`, top: `${y1}%`, width: `${len}%`, height: `${(a.strokeWidth||2)}px`, background: a.color||'#ef4444', transformOrigin: '0 0', transform: `rotate(${angle}deg)`, outline: selectedId===a.id?'2px solid #111827':'none' }} />
                        }
                        if (a.type === 'pen') {
                          const segs: any[] = [];
                          for (let i=1;i<a.points.length;i++) {
                            const p1 = a.points[i-1], p2 = a.points[i];
                            const x1 = p1.x*100, y1 = p1.y*100, x2 = p2.x*100, y2 = p2.y*100;
                            const dx = x2-x1, dy = y2-y1; const len = Math.sqrt(dx*dx+dy*dy);
                            const angle = Math.atan2(dy, dx) * 180/Math.PI;
                            segs.push(<div key={a.id+':'+i} onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }} style={{ position: 'absolute', left: `${x1}%`, top: `${y1}%`, width: `${len}%`, height: `${a.width||2}px`, background: a.color||'#ef4444', transformOrigin: '0 0', transform: `rotate(${angle}deg)` }} />);
                          }
                          return <div key={a.id} style={{ outline: selectedId===a.id?'2px solid #111827':'none' }}>{segs}</div>;
                        }
                        if (a.type === 'comment') {
                          const pt = a.at;
                          return <div key={a.id} style={{ position: 'absolute', left: `${pt.x*100}%`, top: `${pt.y*100}%`, transform: 'translate(-50%, -100%)' }} className="pointer-events-auto" onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }}>
                            <div className="rounded bg-yellow-200 px-1 text-[10px] text-[#111827]">✦</div>
                            {selectedId===a.id && (
                              <div className="mt-1 w-40 rounded border bg-white p-1 text-[11px] shadow">
                                <textarea className="h-16 w-full resize-none rounded border p-1" value={a.text} onChange={(e)=>{
                                  const idx = annos.findIndex(x=> x.id===a.id); if (idx<0) return; const next=annos.slice(); (next[idx] as any).text = e.target.value; onChange(next);
                                }} placeholder="Comentário" />
                                <div className="mt-1 flex justify-end gap-1">
                                  <button className="rounded border px-1" onClick={()=> removeById(a.id)}>Excluir</button>
                                </div>
                              </div>
                            )}
                          </div>
                        }
                        return null;
                      })}
                    </div>
                  )}
                />
              </div>
            </Document>
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-full overflow-hidden" style={{ minHeight: 420 }}>
            <div className="relative" ref={containerRef} onMouseDown={handleDown} onMouseMove={(e)=> handleMove(e)} onMouseUp={handleUp}>
              <Document
                file={(blobUrl || { url: src, httpHeaders: authHeader, withCredentials: true }) as any}
                onLoadSuccess={(p:any)=> setNumPages(p.numPages||1)}
                onLoadError={async (err:any) => {
                  try {
                    const res = await fetch(src, { headers: authHeader as any, credentials: 'include' });
                    if (!res.ok) throw new Error('blob-fetch-failed');
                    const b = await res.blob();
                    const url = URL.createObjectURL(b);
                    setBlobUrl(url);
                  } catch (e) {
                    try {
                      if (altSrc && altSrc !== src) {
                        const r2 = await fetch(altSrc);
                        if (!r2.ok) throw new Error('alt-fetch-failed');
                        const b2 = await r2.blob();
                        const u2 = URL.createObjectURL(b2);
                        setBlobUrl(u2);
                        return;
                      }
                    } catch {}
                    console.error(err);
                  }
                }}
              >
                <Page pageNumber={page} width={Math.floor((containerRef.current?.clientWidth || 640) * zoom)} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div data-testid="overlay-single" className="absolute left-0 top-0 z-10 h-full w-full">
                {pageAnnos.map((a) => {
                  if (a.type === 'highlight') {
                    return a.rects.map((r, i) => (
                      <div key={a.id+':'+i} onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault(); setSelectedId(a.id); if (tool==='select') { const p=normPoint(e); pushUndo(); setDrag({ id:a.id, kind:'move', start: p, origRect: { ...r } }); } }} style={{ position: 'absolute', left: `${r.x*100}%`, top: `${r.y*100}%`, width: `${r.w*100}%`, height: `${r.h*100}%`, background: toHexA((a.color||'#fde047'), (a.opacity ?? opts.highlightOpacity)), outline: selectedId===a.id?'2px solid #111827':'none', cursor: tool==='select'?'move':'crosshair' }} >
                        {selectedId===a.id && tool==='select' && (
                          <Handles rect={r} onStart={(handle, ev)=>{ ev.stopPropagation(); ev.preventDefault(); const p=normPoint(ev as any); pushUndo(); setDrag({ id:a.id, kind:'resize', handle, start: p, origRect: { ...r } }); }} />
                        )}
                      </div>
                    ));
                  }
                  if (a.type === 'box') {
                    const r = a.rect;
                    return <div key={a.id} onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault(); setSelectedId(a.id); if (tool==='select') { const p=normPoint(e); pushUndo(); setDrag({ id:a.id, kind:'move', start: p, origRect: { ...r } }); } }} style={{ position: 'absolute', left: `${r.x*100}%`, top: `${r.y*100}%`, width: `${r.w*100}%`, height: `${r.h*100}%`, border: `${a.strokeWidth||2}px solid ${a.color||'#3b82f6'}`, boxSizing: 'border-box', outline: selectedId===a.id?'2px solid #111827':'none', cursor: tool==='select'?'move':'crosshair' }} >
                      {selectedId===a.id && tool==='select' && (
                        <Handles rect={r} onStart={(handle, ev)=>{ ev.stopPropagation(); ev.preventDefault(); const p=normPoint(ev as any); pushUndo(); setDrag({ id:a.id, kind:'resize', handle, start: p, origRect: { ...r } }); }} />
                      )}
                    </div>
                  }
                  if (a.type === 'strike') {
                    const x1 = a.from.x*100, y1 = a.from.y*100, x2 = a.to.x*100, y2 = a.to.y*100;
                    const dx = x2-x1, dy = y2-y1; const len = Math.sqrt(dx*dx+dy*dy);
                    const angle = Math.atan2(dy, dx) * 180/Math.PI;
                    return <div key={a.id} onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }} style={{ position: 'absolute', left: `${x1}%`, top: `${y1}%`, width: `${len}%`, height: `${(a.strokeWidth||2)}px`, background: a.color||'#ef4444', transformOrigin: '0 0', transform: `rotate(${angle}deg)`, outline: selectedId===a.id?'2px solid #111827':'none' }} />
                  }
                  if (a.type === 'pen') {
                    const segs: any[] = [];
                    for (let i=1;i<a.points.length;i++) {
                      const p1 = a.points[i-1], p2 = a.points[i];
                      const x1 = p1.x*100, y1 = p1.y*100, x2 = p2.x*100, y2 = p2.y*100;
                      const dx = x2-x1, dy = y2-y1; const len = Math.sqrt(dx*dx+dy*dy);
                      const angle = Math.atan2(dy, dx) * 180/Math.PI;
                      segs.push(<div key={a.id+':'+i} onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }} style={{ position: 'absolute', left: `${x1}%`, top: `${y1}%`, width: `${len}%`, height: `${a.width||2}px`, background: a.color||'#ef4444', transformOrigin: '0 0', transform: `rotate(${angle}deg)` }} />);
                    }
                    return <div key={a.id} style={{ outline: selectedId===a.id?'2px solid #111827':'none' }}>{segs}</div>;
                  }
                  if (a.type === 'comment') {
                    const p2 = a.at;
                    return <div key={a.id} style={{ position: 'absolute', left: `${p2.x*100}%`, top: `${p2.y*100}%`, transform: 'translate(-50%, -100%)' }} className="pointer-events-auto" onMouseDown={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }}>
                      <div className="rounded bg-yellow-200 px-1 text-[10px] text-[#111827]">✦</div>
                      {selectedId===a.id && (
                        <div className="mt-1 w-40 rounded border bg-white p-1 text-[11px] shadow">
                          <textarea className="h-16 w-full resize-none rounded border p-1" value={a.text} onChange={(e)=>{
                            const idx = annos.findIndex(x=> x.id===a.id); if (idx<0) return; const next=annos.slice(); (next[idx] as any).text = e.target.value; onChange(next);
                          }} placeholder="Comentário" />
                          <div className="mt-1 flex justify-end gap-1">
                            <button className="rounded border px-1" onClick={()=> removeById(a.id)}>Excluir</button>
                          </div>
                        </div>
                      )}
                    </div>
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Handle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function boundRect(r: {x:number;y:number;w:number;h:number}) {
  const x = clamp01(r.x), y = clamp01(r.y);
  const w = Math.max(0.001, Math.min(1 - x, r.w));
  const h = Math.max(0.001, Math.min(1 - y, r.h));
  return { x, y, w, h };
}
function toHexA(hex: string, opacity: number) {
  // converte #rrggbb + alpha 0..1 para #rrggbbaa
  const a = Math.max(0, Math.min(255, Math.round(opacity * 255)));
  const aa = (a < 16 ? '0' : '') + a.toString(16);
  if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    return `#${h}${aa}`;
  }
  return hex;
}
function resizeFromHandle(base: {x:number;y:number;w:number;h:number}, d: {x:number;y:number}, handle: Handle, opts?: { keepRatio?: boolean }) {
  let { x, y, w, h } = base;
  const min = 0.01;
  if (handle.includes('n')) { y = y + d.y; h = h - d.y; }
  if (handle.includes('s')) { h = h + d.y; }
  if (handle.includes('w')) { x = x + d.x; w = w - d.x; }
  if (handle.includes('e')) { w = w + d.x; }
  // normalizar quando invertido
  if (w < 0) { x = x + w; w = -w; }
  if (h < 0) { y = y + h; h = -h; }
  if (opts?.keepRatio) {
    const ratio = base.w / (base.h || 1);
    if (w / (h || 1) > ratio) {
      // ajustar largura
      w = h * ratio;
      if (handle.includes('w')) x = (base.x + base.w) - w;
    } else {
      // ajustar altura
      h = w / ratio;
      if (handle.includes('n')) y = (base.y + base.h) - h;
    }
  }
  w = Math.max(min, w); h = Math.max(min, h);
  return boundRect({ x, y, w, h });
}

function snapRectEdges(r: {x:number;y:number;w:number;h:number}, eps = 0.01) {
  let { x, y, w, h } = r;
  // snap para bordas esquerda/direita
  if (Math.abs(x - 0) < eps) x = 0;
  if (Math.abs(x + w - 1) < eps) x = 1 - w;
  // snap para bordas superior/inferior
  if (Math.abs(y - 0) < eps) y = 0;
  if (Math.abs(y + h - 1) < eps) y = 1 - h;
  return { x, y, w, h };
}

function Handles({ rect, onStart }: { rect: {x:number;y:number;w:number;h:number}; onStart: (h: Handle, ev: React.MouseEvent) => void }) {
  const hs: { h: Handle; x: number; y: number; cursor: string }[] = [
    { h: 'nw', x: rect.x, y: rect.y, cursor: 'nwse-resize' },
    { h: 'n', x: rect.x + rect.w/2, y: rect.y, cursor: 'ns-resize' },
    { h: 'ne', x: rect.x + rect.w, y: rect.y, cursor: 'nesw-resize' },
    { h: 'e', x: rect.x + rect.w, y: rect.y + rect.h/2, cursor: 'ew-resize' },
    { h: 'se', x: rect.x + rect.w, y: rect.y + rect.h, cursor: 'nwse-resize' },
    { h: 's', x: rect.x + rect.w/2, y: rect.y + rect.h, cursor: 'ns-resize' },
    { h: 'sw', x: rect.x, y: rect.y + rect.h, cursor: 'nesw-resize' },
    { h: 'w', x: rect.x, y: rect.y + rect.h/2, cursor: 'ew-resize' },
  ];
  return (
    <>
      {hs.map(({ h, x, y, cursor }) => (
        <div key={h} onMouseDown={(e)=> onStart(h, e)} style={{ position: 'absolute', left: `${x*100}%`, top: `${y*100}%`, width: 10, height: 10, transform: 'translate(-50%, -50%)', background: '#111827', borderRadius: 2, cursor }} />
      ))}
    </>
  );
}

function VirtualPages({ numPages, zoom, aspect, pageGap, scrollTop, viewportH, bufferPx, onPageView, setPageRef, renderPage, renderOverlay }: {
  numPages: number; zoom: number; aspect: number; pageGap: number; scrollTop: number; viewportH: number; bufferPx?: number;
  onPageView: (p: number)=> void;
  setPageRef: (p: number, el: HTMLDivElement | null) => void;
  renderPage: (p: number, width: number) => ReactElement;
  renderOverlay: (p: number) => ReactElement;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hostW, setHostW] = useState(640);
  useEffect(() => {
    const el = hostRef.current?.parentElement as HTMLElement | null;
    function measure() { if (!el) return; const w = el.clientWidth; setHostW(w); }
    measure();
    const ro = new ResizeObserver(measure); if (el) ro.observe(el);
    return () => { try { if (el) ro.unobserve(el); } catch {} };
  }, []);
  const pageW = Math.floor(hostW * zoom);
  const pageH = Math.floor(pageW * aspect);
  const totalH = numPages * pageH + (numPages - 1) * pageGap;
  const { first: firstVisible, last: lastVisible, topPad } = computeVisibleRange({
    numPages,
    pageHeight: pageH,
    pageGap,
    scrollTop,
    viewportH,
    buffer: bufferPx ?? viewportH,
  });
  const items: number[] = [];
  for (let p = firstVisible; p <= lastVisible; p++) items.push(p);
  useEffect(() => {
    // reportar a página central do viewport como "vista"
    const mid = Math.round((scrollTop + viewportH / 2) / (pageH + pageGap)) + 1;
    const clamped = Math.min(numPages, Math.max(1, mid));
    onPageView(clamped);
  }, [scrollTop, viewportH, pageH, pageGap, numPages, onPageView]);
  return (
    <div ref={hostRef} style={{ height: totalH, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: topPad }}>
        {items.map((p) => (
          <div key={p} ref={(el)=> setPageRef(p, el)} style={{ position: 'relative', width: pageW, height: pageH, margin: '0 auto', marginBottom: pageGap }}>
            {renderPage(p, pageW)}
            {renderOverlay(p)}
          </div>
        ))}
      </div>
    </div>
  );
}

function titleForTool(t: 'select'|'highlight'|'pen'|'box'|'strike'|'comment'|'erase') {
  switch (t) {
    case 'select': return 'Selecionar (V)';
    case 'highlight': return 'Destaque (H)';
    case 'pen': return 'Caneta (P)';
    case 'box': return 'Caixa (B)';
    case 'strike': return 'Risco (S)';
    case 'comment': return 'Comentário (C)';
    case 'erase': return 'Borracha (E)';
  }
}

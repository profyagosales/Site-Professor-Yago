import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import type { Annotation } from '@/types/redacao';
import { getToken } from '@/utils/auth';

// Configure worker for Vite/ESM
try {
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
} catch {}

type Props = {
  src: string;
  // Fallback absoluto (ex.: URL direta do Cloudinary) caso o proxy /api falhe
  altSrc?: string;
  annotations: Annotation[];
  onAdd: (ann: Annotation) => void;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, patch: Partial<Annotation>) => void;
  pageNumber?: number; // deprecated, use currentPage
  currentPage?: number; // controlled current page (1-based)
  onPageChange?: (page: number) => void;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  storageKey?: string; // persist zoom/pan per essay
};

export default function PdfHighlighter({ src, altSrc, annotations, onAdd, onRemove, onUpdate, pageNumber = 1, currentPage: controlledPage, onPageChange, selectedIndex, onSelect, storageKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(480);
  const [renderedHeight, setRenderedHeight] = useState<number>(640);
  const [origSize, setOrigSize] = useState<{ w: number; h: number } | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [uncontrolledPage, setUncontrolledPage] = useState<number>(pageNumber);
  const [zoom, setZoom] = useState<number>(1);
  const [mode, setMode] = useState<'none' | 'green' | 'blue'>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [internalSelected, setInternalSelected] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [action, setAction] = useState<null | { kind: 'drag' | 'resize'; idx: number; handle?: string; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } }>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimerRef = useRef<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const authHeader = useMemo(() => {
    try {
      const t = getToken();
      return t ? { Authorization: `Bearer ${t}` } : undefined;
    } catch { return undefined; }
  }, []);
  // atualiza blobUrl ao trocar src
  useEffect(() => {
    if (blobUrl) {
      try { URL.revokeObjectURL(blobUrl); } catch {}
      setBlobUrl(null);
    }
  }, [src]);
  useEffect(() => () => { if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch {} } }, [blobUrl]);
  
  // Helpers para navegação entre páginas com anotações
  function pageHasAnnotations(p: number) { // p: 1-based
    const target = p - 1;
    return annotations.some((a) => (a as any)?.bbox?.page === target);
  }
  function jumpToAnnotated(dir: 1 | -1) {
    const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
    if (annotations.length === 0 || numPages <= 1) return;
    // procura até numPages passos no sentido indicado, com wrap
    for (let i = 1; i <= numPages; i++) {
      let np = cp + i * dir;
      if (np < 1) np = numPages - ((1 - np) % numPages);
      if (np > numPages) np = ((np - 1) % numPages) + 1;
      if (pageHasAnnotations(np)) {
        onPageChange ? onPageChange(np) : setUncontrolledPage(np);
        return;
      }
    }
  }

  // Load original page size using pdf-lib to ensure bbox conversion is correct
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        try { const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`; } catch {}
        // tenta baixar via src; se falhar (ex.: 5xx no proxy), tenta altSrc
        let ab: ArrayBuffer | null = null;
        try {
          ab = await fetch(src, { headers }).then((r) => r.arrayBuffer());
        } catch {
          if (altSrc) {
            try { ab = await fetch(altSrc).then((r) => r.arrayBuffer()); } catch {}
          }
        }
        if (!ab) return;
        const pdf = await PDFLibDocument.load(ab);
    const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
    const page = pdf.getPage(Math.max(0, cp - 1));
        const { width, height } = page.getSize();
        if (!alive) return;
        setOrigSize({ w: width, h: height });
      } catch (e) {
        // ignore; keep selection disabled if we can't fetch size
      }
    })();
    return () => {
      alive = false;
    };
  }, [src, controlledPage, uncontrolledPage]);

  // ResizeObserver to keep Page width in sync
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = Math.floor(entry.contentRect.width);
      if (w && w !== containerWidth) setContainerWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After page render, probe canvas height to size overlay correctly
  function handleRenderSuccess() {
    const el = containerRef.current;
    if (!el) return;
    const canvas = el.querySelector('canvas');
    if (canvas) {
      const h = Math.floor((canvas as HTMLCanvasElement).clientHeight);
      if (h && h !== renderedHeight) setRenderedHeight(h);
    }
  }

  function onDocLoadSuccess(p: any) {
    setNumPages(p.numPages || 1);
    handleRenderSuccess();
  }

  const canSelect = useMemo(() => Boolean(origSize && mode !== 'none'), [origSize, mode]);
  const effectiveWidth = Math.max(100, Math.floor(containerWidth * zoom));

  // Clamp pan when sizes, zoom or page changes
  useEffect(() => {
    const vp = containerRef.current;
    if (!vp) return;
    const vpW = vp.clientWidth || effectiveWidth;
    const vpH = Math.max(420, vp.clientHeight || renderedHeight);
    const minX = Math.min(0, vpW - effectiveWidth);
    const minY = Math.min(0, vpH - renderedHeight);
    setPan((p) => ({ x: Math.max(minX, Math.min(0, p.x)), y: Math.max(minY, Math.min(0, p.y)) }));
  }, [effectiveWidth, renderedHeight, controlledPage, uncontrolledPage]);

  function centerContent() {
    const vp = containerRef.current;
    if (!vp) return;
    const vpW = vp.clientWidth || effectiveWidth;
    const vpH = Math.max(420, vp.clientHeight || renderedHeight);
    const minX = Math.min(0, vpW - effectiveWidth);
    const minY = Math.min(0, vpH - renderedHeight);
    const cx = Math.max(minX, Math.min(0, Math.floor((vpW - effectiveWidth) / 2)));
    const cy = Math.max(minY, Math.min(0, Math.floor((vpH - renderedHeight) / 2)));
    setPan({ x: cx, y: cy });
  }

  function resetView() {
    setZoom(1);
    centerContent();
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  }

  function fitToPageWidth() {
    const vp = containerRef.current;
    if (!vp) return;
    // zoom para caber a largura disponível
    const w = vp.clientWidth || containerWidth;
    if (!w) return;
    const z = Math.max(0.5, Math.min(2, w / containerWidth));
    setZoom(z);
    setTimeout(() => centerContent(), 0);
  }

  // Persistence: load on mount/change of storageKey
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
    const data = JSON.parse(raw) as { zoom?: number; pan?: { x: number; y: number }; panByPage?: Record<string, { x: number; y: number }>; mode?: 'none'|'green'|'blue' };
      if (typeof data.zoom === 'number') setZoom(Math.max(0.5, Math.min(2, data.zoom)));
      const cp = String(Math.max(1, (controlledPage ?? uncontrolledPage)));
      const p = (data.panByPage && data.panByPage[cp]) || data.pan;
      if (p && typeof p.x === 'number' && typeof p.y === 'number') setPan(p);
    if (data.mode) setMode(data.mode);
    } catch {}
  }, [storageKey]);
  // Save on changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      let base: any = {};
      try { base = raw ? JSON.parse(raw) : {}; } catch { base = {}; }
      const cp = String(Math.max(1, (controlledPage ?? uncontrolledPage)));
      const panByPage = { ...(base.panByPage || {}) };
      panByPage[cp] = pan;
    localStorage.setItem(storageKey, JSON.stringify({ zoom, panByPage, mode }));
    } catch {}
  }, [storageKey, zoom, pan, mode, controlledPage, uncontrolledPage]);

  // On page change: restore pan from storage or center
  useEffect(() => {
    if (!storageKey) { centerContent(); return; }
    try {
      const raw = localStorage.getItem(storageKey);
      const data = raw ? JSON.parse(raw) : null;
      const cp = String(Math.max(1, (controlledPage ?? uncontrolledPage)));
      const p = data?.panByPage?.[cp];
      // pequeno debounce para evitar efeito "jump" quando o Page re-renderiza
      setTimeout(() => {
        if (p && typeof p.x === 'number' && typeof p.y === 'number') setPan(p);
        else centerContent();
      }, 0);
    } catch { centerContent(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledPage, uncontrolledPage]);

  function onMouseDown(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (spaceDown) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOrigin(pan);
      return;
    }
    // If clicked inside an existing box, start drag
  if (origSize) {
      const hit = hitTestBox(x, y);
      if (hit) {
        const { idx, handle } = hit;
    setInternalSelected(idx);
    onSelect?.(idx);
        const b = projectToRendered(annotations[idx].bbox as any);
        if (handle) {
          setAction({ kind: 'resize', idx, handle, startX: x, startY: y, orig: b });
        } else {
          setAction({ kind: 'drag', idx, startX: x, startY: y, orig: b });
        }
        return;
      }
    }
    if (!canSelect) return;
    setDragStart({ x, y });
    setDragRect({ x, y, w: 0, h: 0 });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const viewport = containerRef.current as HTMLDivElement | null;
      const vpW = viewport?.clientWidth || effectiveWidth;
      const vpH = viewport?.clientHeight || renderedHeight;
      const minX = Math.min(0, vpW - effectiveWidth);
      const minY = Math.min(0, vpH - renderedHeight);
      const nx = Math.max(minX, Math.min(0, panOrigin.x + dx));
      const ny = Math.max(minY, Math.min(0, panOrigin.y + dy));
      setPan({ x: nx, y: ny });
      return;
    }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (action && origSize) {
      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
      const minSize = 6; // px
      const orig = action.orig;
      let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
      if (action.kind === 'drag') {
        const dx = x - action.startX;
        const dy = y - action.startY;
        nx = clamp(orig.x + dx, 0, effectiveWidth - orig.w);
        ny = clamp(orig.y + dy, 0, renderedHeight - orig.h);
      } else if (action.kind === 'resize') {
        const dx = x - action.startX;
        const dy = y - action.startY;
        const h = action.handle;
        if (h && h.includes('w')) { nx = clamp(orig.x + dx, 0, orig.x + orig.w - minSize); nw = clamp(orig.w - dx, minSize, effectiveWidth - nx); }
        if (h && h.includes('e')) { nw = clamp(orig.w + dx, minSize, effectiveWidth - orig.x); }
        if (h && h.includes('n')) { ny = clamp(orig.y + dy, 0, orig.y + orig.h - minSize); nh = clamp(orig.h - dy, minSize, renderedHeight - ny); }
        if (h && h.includes('s')) { nh = clamp(orig.h + dy, minSize, renderedHeight - orig.y); }
      }
      setAction({ ...action, orig: { x: nx, y: ny, w: nw, h: nh } });
      return;
    }
    if (!dragStart) return;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const r = {
      x: Math.max(0, Math.min(dragStart.x, dragStart.x + dx)),
      y: Math.max(0, Math.min(dragStart.y, dragStart.y + dy)),
      w: Math.abs(dx),
      h: Math.abs(dy)
    };
    setDragRect(r);
  }

  function onMouseUp() {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    // Commit drag/resize
    if (action && origSize) {
      const { idx, orig } = action;
  const scaleX = origSize.w / effectiveWidth;
      const scaleY = origSize.h / renderedHeight;
      const x = Math.max(0, orig.x * scaleX);
      const y = Math.max(0, orig.y * scaleY);
      const w = Math.max(1, orig.w * scaleX);
      const h = Math.max(1, orig.h * scaleY);
  const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
  onUpdate?.(idx, { bbox: { page: cp - 1, x, y, w, h } } as any);
      setAction(null);
      return;
    }
    if (!dragRect || !origSize) {
      setDragStart(null);
      setDragRect(null);
      return;
    }
    // Convert from rendered pixels (top-left origin) to original PDF points (top-left origin)
  const scaleX = origSize.w / effectiveWidth;
    const scaleY = origSize.h / renderedHeight;
    const x = Math.max(0, dragRect.x * scaleX);
    const y = Math.max(0, dragRect.y * scaleY);
    const w = Math.max(1, dragRect.w * scaleX);
    const h = Math.max(1, dragRect.h * scaleY);
    if (w > 2 && h > 2 && mode !== 'none') {
      const label = mode === 'green' ? 'Erro' : 'Obs';
      const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
      onAdd({ color: mode, label, comment: '', bbox: { page: cp - 1, x, y, w, h } });
    }
    setDragStart(null);
    setDragRect(null);
  }

  // Keyboard shortcuts: E=Erro (green), O=Obs (blue), ESC=none; Space = pan
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Zoom via teclado com Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '0') { e.preventDefault(); setZoom(1); return; }
        if (e.key === '+' || e.key === '=' ) { e.preventDefault(); setZoom((z)=> Math.min(2, Math.round((z+0.1)*10)/10)); return; }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom((z)=> Math.max(0.5, Math.round((z-0.1)*10)/10)); return; }
      }
      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedIndex ?? internalSelected) != null) {
        const idx = (selectedIndex ?? internalSelected)!;
        onRemove?.(idx);
        setInternalSelected(null);
        onSelect?.(null);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      if (e.key === 'Escape') setMode('none');
      if (e.key.toLowerCase() === 'e') setMode((m) => (m === 'green' ? 'none' : 'green'));
      if (e.key.toLowerCase() === 'o') setMode((m) => (m === 'blue' ? 'none' : 'blue'));
  if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); setShowHelp((s)=>!s); }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(false);
        setIsPanning(false);
        setPanStart(null);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Auto-centra anotação selecionada (se estiver em outra região da página)
  useEffect(() => {
    if ((selectedIndex ?? internalSelected) == null) return;
    const idx = (selectedIndex ?? internalSelected)!;
    const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
    const a = annotations[idx];
    const b = a?.bbox as any;
    if (!b || b.page !== cp - 1 || !origSize) return;
    const r = projectToRendered(b);
    const vp = containerRef.current;
    if (!vp) return;
    const vpW = vp.clientWidth || effectiveWidth;
    const vpH = Math.max(420, vp.clientHeight || renderedHeight);
    const margin = 24;
    // área visível em coords do conteúdo
    const visLeft = -pan.x, visTop = -pan.y, visRight = -pan.x + vpW, visBottom = -pan.y + vpH;
    let nx = pan.x, ny = pan.y;
    if (r.x < visLeft + margin) nx = Math.min(0, -(r.x - margin));
    if (r.x + r.w > visRight - margin) nx = Math.max(vpW - effectiveWidth, -(r.x + r.w - vpW + margin));
    if (r.y < visTop + margin) ny = Math.min(0, -(r.y - margin));
    if (r.y + r.h > visBottom - margin) ny = Math.max(vpH - renderedHeight, -(r.y + r.h - vpH + margin));
    if (nx !== pan.x || ny !== pan.y) setPan({ x: nx, y: ny });
  }, [selectedIndex, internalSelected, annotations, origSize, effectiveWidth, renderedHeight, pan.x, pan.y, controlledPage, uncontrolledPage]);

  // Helpers
  function projectToRendered(bbox: any): { x: number; y: number; w: number; h: number } {
    if (!bbox || !origSize) return { x: 0, y: 0, w: 0, h: 0 };
  const scaleX = effectiveWidth / origSize.w;
    const scaleY = renderedHeight / origSize.h;
    return { x: bbox.x * scaleX, y: bbox.y * scaleY, w: bbox.w * scaleX, h: bbox.h * scaleY };
  }
  function hitTestBox(x: number, y: number): null | { idx: number; handle?: string } {
    const pad = 6;
    for (let idx = 0; idx < annotations.length; idx++) {
      const b = annotations[idx].bbox as any;
      const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
      if (!b || b.page !== cp - 1) continue;
      const r = projectToRendered(b);
      const inside = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      if (!inside) continue;
      // Handles
      const handles: Array<{ name: string; x: number; y: number }> = [
        { name: 'nw', x: r.x, y: r.y },
        { name: 'ne', x: r.x + r.w, y: r.y },
        { name: 'sw', x: r.x, y: r.y + r.h },
        { name: 'se', x: r.x + r.w, y: r.y + r.h }
      ];
      for (const h of handles) {
        if (Math.abs(x - h.x) <= pad && Math.abs(y - h.y) <= pad) return { idx, handle: h.name };
      }
      return { idx };
    }
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="text-sm text-ys-ink-2">Marca-texto no PDF</div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-sm ${mode === 'green' ? 'border-green-600 text-green-700' : 'border-gray-200'}`}
            onClick={() => setMode(mode === 'green' ? 'none' : 'green')}
            title="Erro"
          >Erro</button>
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-sm ${mode === 'blue' ? 'border-blue-600 text-blue-700' : 'border-gray-200'}`}
            onClick={() => setMode(mode === 'blue' ? 'none' : 'blue')}
            title="Observação"
          >Obs</button>
          <div className="ml-2 inline-flex items-center gap-1 text-xs text-ys-ink-2">
            <span>Zoom</span>
            <button type="button" className="rounded border px-2 py-0.5" title="Diminuir zoom" onClick={()=>setZoom(z=> Math.max(0.5, Math.round((z-0.1)*10)/10))}>-</button>
            <span className="min-w-[3ch] text-center">{Math.round(zoom*100)}%</span>
            <button type="button" className="rounded border px-2 py-0.5" title="Aumentar zoom" onClick={()=>setZoom(z=> Math.min(2, Math.round((z+0.1)*10)/10))}>+</button>
            <button type="button" className="rounded border px-2 py-0.5" title="Zoom 100%" onClick={()=>setZoom(1)}>100%</button>
            <button type="button" className="rounded border px-2 py-0.5" title="Ajustar à página" onClick={fitToPageWidth}>Ajustar</button>
            <button type="button" className="rounded border px-2 py-0.5" onClick={resetView} title="Resetar visualização">Resetar</button>
            <button type="button" className="rounded border px-2 py-0.5" title="Ajuda (?)" onClick={()=>setShowHelp((s)=>!s)}>?</button>
          </div>
        </div>
      </div>
      {showHelp && (
        <div className="mx-2 mb-1 rounded-md border bg-white p-2 text-[12px] text-[#111827] shadow-sm">
          <div className="mb-1 font-medium">Atalhos</div>
          <ul className="list-inside list-disc space-y-0.5">
            <li>E: modo Erro • O: modo Obs • ESC: sair</li>
            <li>Del/Backspace: remover seleção • Ctrl+Clique: remover</li>
            <li>Barra de espaço + arrastar: mover (pan)</li>
            <li>Ctrl + scroll: zoom • Ctrl + / - / 0: zoom</li>
            <li>⏮︎/⏭︎: pular para páginas com anotações</li>
          </ul>
        </div>
      )}
  <div className="flex items-center justify-between gap-2 px-2 text-xs text-ys-ink-2">
        <div className="flex items-center gap-2">
          <span>Modo:</span>
          <span className={`rounded px-2 py-0.5 ${mode==='green' ? 'bg-green-100 text-green-800' : mode==='blue' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{mode==='green' ? 'Erro' : mode==='blue' ? 'Obs' : 'Seleção'}</span>
          <span className="text-[11px] text-ys-ink-2">Atalhos: E (Erro), O (Obs), ESC (Sair), Del (Remover)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-0.5"
            title="Página anterior"
            aria-label="Página anterior"
            disabled={(controlledPage ?? uncontrolledPage) <= 1}
            onClick={() => (onPageChange ? onPageChange(Math.max(1, (controlledPage ?? uncontrolledPage) - 1)) : setUncontrolledPage((p) => Math.max(1, p - 1)))}
          >◀</button>
          <span>Página {controlledPage ?? uncontrolledPage} de {numPages}</span>
          <button
            type="button"
            className="rounded border px-2 py-0.5"
            title="Próxima página"
            aria-label="Próxima página"
            disabled={(controlledPage ?? uncontrolledPage) >= numPages}
            onClick={() => (onPageChange ? onPageChange(Math.min(numPages, (controlledPage ?? uncontrolledPage) + 1)) : setUncontrolledPage((p) => Math.min(numPages, p + 1)))}
          >▶</button>
          <button type="button" className="rounded border px-2 py-0.5" title="Página anterior com anotações" aria-label="Página anterior com anotações" disabled={annotations.length===0} onClick={()=>jumpToAnnotated(-1)}>⏮︎</button>
          <button type="button" className="rounded border px-2 py-0.5" title="Próxima página com anotações" aria-label="Próxima página com anotações" disabled={annotations.length===0} onClick={()=>jumpToAnnotated(1)}>⏭︎</button>
          <button type="button" className="rounded border px-2 py-0.5" onClick={centerContent} title="Centralizar" aria-label="Centralizar">⧉</button>
        </div>
      </div>
  <div ref={containerRef} className="relative mx-auto w-full max-w-full overflow-hidden" style={{ minHeight: 420 }} onWheel={(e)=>{ if (e.ctrlKey) { e.preventDefault(); setZoom(z=> Math.max(0.5, Math.min(2, Math.round((z + (e.deltaY < 0 ? 0.1 : -0.1))*10)/10))); } }}>
    <div style={{ position: 'relative', transform: `translate(${pan.x}px, ${pan.y}px)` }}>
  <Document
            file={(blobUrl || { url: src, httpHeaders: authHeader, withCredentials: true }) as any}
            onLoadSuccess={onDocLoadSuccess}
            onLoadError={async (err: any) => {
              // fallback: tenta baixar como blob com credenciais e reabrir
              try {
                const res = await fetch(src, { headers: authHeader as any, credentials: 'include' });
                if (!res.ok) throw new Error('blob-fetch-failed');
                const b = await res.blob();
                const url = URL.createObjectURL(b);
                setBlobUrl(url);
              } catch (e) {
                // tenta URL alternativa direta
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
          <Page
      pageNumber={controlledPage ?? uncontrolledPage}
    width={effectiveWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            onRenderSuccess={handleRenderSuccess}
          />
        </Document>
        {/* Selection overlay */}
        <div
          className="absolute left-0 top-0"
      style={{ width: effectiveWidth, height: renderedHeight, cursor: isPanning ? 'grabbing' : (spaceDown ? 'grab' : (canSelect ? 'crosshair' : 'default')) }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {/* Existing annotations (first page only) */}
          {origSize && annotations.map((a, idx) => {
            const b = a.bbox as any;
            const cp = Math.max(1, (controlledPage ?? uncontrolledPage));
            if (!b || b.page !== cp - 1) return null;
            const { x, y, w, h } = projectToRendered(b);
      const color = a.color === 'green' ? '#22c55e' : a.color === 'blue' ? '#3b82f6' : '#ef4444';
      const fill = a.color === 'green' ? 'rgba(34,197,94,0.16)' : a.color === 'blue' ? 'rgba(59,130,246,0.16)' : 'rgba(239,68,68,0.16)';
            return (
              <div
                key={idx}
        style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: `2px solid ${color}`, background: fill, boxSizing: 'border-box', outline: (selectedIndex ?? internalSelected) === idx ? '2px solid #111827' : 'none' }}
                onClick={(e) => {
                  if ((e.ctrlKey || e.metaKey) && onRemove) {
                    if (window.confirm('Remover esta marcação?')) onRemove(idx);
                    return;
                  }
                  setInternalSelected(idx);
                  onSelect?.(idx);
                }}
                onMouseEnter={() => {
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = window.setTimeout(() => setHoveredIndex(idx), 200);
                }}
                onMouseLeave={() => {
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                  setHoveredIndex((h)=> (h===idx? null : h));
                }}
                title="Clique para selecionar (Ctrl+Clique remove)"
              >
                <span style={{ position: 'absolute', right: -18, top: -10, background: '#111827', color: 'white', fontSize: 10, lineHeight: '12px', padding: '1px 4px', borderRadius: 3 }}>{idx + 1}</span>
                {/* Botão selecionar na lista */}
                <button
                  type="button"
                  title="Selecionar na lista"
                  onClick={(e)=>{ e.stopPropagation(); setInternalSelected(idx); onSelect?.(idx); }}
                  style={{ position: 'absolute', left: -18, top: -10, background: '#111827', color: 'white', fontSize: 10, lineHeight: '12px', padding: '1px 4px', borderRadius: 3, cursor: 'pointer' }}
                >↦</button>
                {/* Resize handles */}
                <span style={{ position: 'absolute', left: -5, top: -5, width: 10, height: 10, background: '#111827', borderRadius: 2, cursor: 'nwse-resize' }} />
                <span style={{ position: 'absolute', right: -5, top: -5, width: 10, height: 10, background: '#111827', borderRadius: 2, cursor: 'nesw-resize' }} />
                <span style={{ position: 'absolute', left: -5, bottom: -5, width: 10, height: 10, background: '#111827', borderRadius: 2, cursor: 'nesw-resize' }} />
                <span style={{ position: 'absolute', right: -5, bottom: -5, width: 10, height: 10, background: '#111827', borderRadius: 2, cursor: 'nwse-resize' }} />
                {hoveredIndex === idx && (
                  <div style={{ position: 'absolute', left: 0, top: -36, maxWidth: 280, background: 'rgba(17,24,39,0.96)', color: 'white', fontSize: 11, lineHeight: '14px', padding: '6px 8px', borderRadius: 4, pointerEvents: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{a.label || (a.color==='green'?'Erro':'Obs')}</div>
                    {a.comment && <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{a.comment}</div>}
                  </div>
                )}
              </div>
            );
          })}

          {/* Drag rectangle */}
          {dragRect && (
            <div style={{ position: 'absolute', left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h, border: `2px dashed ${mode === 'green' ? '#22c55e' : '#3b82f6'}`, background: 'rgba(0,0,0,0.03)' }}></div>
          )}
    </div>
  </div>
      </div>
  <div className="px-2 pt-1 text-xs text-ys-ink-2">{mode === 'none' ? 'Selecione um modo (Erro ou Obs) para desenhar caixas' : 'Arraste sobre o texto para marcar.'}</div>
    </div>
  );
}

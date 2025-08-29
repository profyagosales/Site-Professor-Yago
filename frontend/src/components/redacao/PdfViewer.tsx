import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { getToken } from '@/utils/auth';
// Carregamento dinâmico para evitar bundling pesado em testes
const pdfjsLib = await import('pdfjs-dist');
try {
  // @ts-ignore
  const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
} catch {}

type Highlight = { page: number; x: number; y: number; w: number; h: number };
type Comment = { page: number; x: number; y: number; text?: string };

export default function PdfViewer({ essayId }: { essayId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [anns, setAnns] = useState<{ highlights: Highlight[]; comments: Comment[] }>({ highlights: [], comments: [] });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = getToken?.();
        const res = await fetch(`/api/essays/${essayId}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!res.ok) throw new Error('PDF fetch failed');
        const data = await res.arrayBuffer();
        // @ts-ignore
        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (!alive) return;
        setPdf(doc);
      } catch (e) { /* noop */ }
    })();
    return () => { alive = false; };
  }, [essayId]);

  // Load annotations
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = getToken?.();
        const r = await fetch(`/api/essays/${essayId}/annotations`, {
          headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
        });
        if (!alive) return;
        if (r.ok) {
          const j = await r.json();
          setAnns({ highlights: Array.isArray(j.highlights) ? j.highlights : [], comments: Array.isArray(j.comments) ? j.comments : [] });
        }
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [essayId]);

  // Debounced save on anns change
  useEffect(() => {
    if (!essayId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const token = getToken?.();
        await fetch(`/api/essays/${essayId}/annotations`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(anns)
        });
      } catch { /* noop */ }
      finally { setIsSaving(false); }
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [essayId, anns]);

  // Render pages
  useEffect(() => {
    if (!pdf || !containerRef.current) return;
    const host = containerRef.current;
    host.innerHTML = '';
  (async () => {
      for (let i = 1; i <= (pdf.numPages || 1); i++) {
        // eslint-disable-next-line no-await-in-loop
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        const wrap = document.createElement('div');
        wrap.style.position = 'relative';
        wrap.style.marginBottom = '16px';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        wrap.appendChild(canvas);
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = `${viewport.width}px`;
        overlay.style.height = `${viewport.height}px`;
        overlay.style.pointerEvents = 'auto';
        wrap.appendChild(overlay);
        host.appendChild(wrap);
        // eslint-disable-next-line no-await-in-loop
        await page.render({ canvasContext: ctx as any, viewport }).promise;
        // desenhar highlights
        const Hs = anns.highlights.filter(h => h.page === i);
        for (const h of Hs) {
          const el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.left = `${(h.x || 0) * viewport.width}px`;
          el.style.top = `${(h.y || 0) * viewport.height}px`;
          el.style.width = `${(h.w || 0) * viewport.width}px`;
          el.style.height = `${(h.h || 0) * viewport.height}px`;
          el.style.background = 'rgba(255,235,59,0.35)';
          el.style.borderRadius = '2px';
          el.style.cursor = 'pointer';
          // Remover com botão direito
          el.addEventListener('contextmenu', (ev) => {
            ev.preventDefault();
            setAnns((prev) => ({
              ...prev,
              highlights: prev.highlights.filter((x) => x !== h)
            }));
          });
          overlay.appendChild(el);
        }
        const Cs = anns.comments.filter(c => c.page === i);
        for (const c of Cs) {
          const pin = document.createElement('div');
          pin.style.position = 'absolute';
          pin.style.left = `${(c.x || 0) * viewport.width}px`;
          pin.style.top = `${(c.y || 0) * viewport.height}px`;
          pin.style.transform = 'translate(-50%, -100%)';
          pin.style.background = '#111827';
          pin.style.color = 'white';
          pin.style.fontSize = '12px';
          pin.style.padding = '2px 6px';
          pin.style.borderRadius = '6px';
          pin.textContent = c.text || '';
          pin.title = 'Clique para editar, botão direito para remover';
          pin.style.cursor = 'pointer';
          pin.addEventListener('click', () => {
            const next = window.prompt('Comentário', c.text || '') ?? c.text;
            setAnns((prev) => ({
              ...prev,
              comments: prev.comments.map((x) => (x === c ? { ...x, text: next || '' } : x))
            }));
          });
          pin.addEventListener('contextmenu', (ev) => {
            ev.preventDefault();
            setAnns((prev) => ({
              ...prev,
              comments: prev.comments.filter((x) => x !== c)
            }));
          });
          overlay.appendChild(pin);
        }

        // Interação: arrastar para criar highlight, duplo clique para comentar
        let dragging = false;
        let start = { x: 0, y: 0 };
        let ghost: HTMLDivElement | null = null;
        const toNorm = (clientX: number, clientY: number) => {
          const rect = overlay.getBoundingClientRect();
          const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
          const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
          return { x: nx, y: ny };
        };
        overlay.addEventListener('mousedown', (ev) => {
          if (ev.button !== 0) return; // apenas botão esquerdo
          dragging = true;
          start = toNorm(ev.clientX, ev.clientY);
          ghost = document.createElement('div');
          ghost.style.position = 'absolute';
          ghost.style.left = `${start.x * viewport.width}px`;
          ghost.style.top = `${start.y * viewport.height}px`;
          ghost.style.width = '0px';
          ghost.style.height = '0px';
          ghost.style.background = 'rgba(255,235,59,0.35)';
          ghost.style.borderRadius = '2px';
          overlay.appendChild(ghost);
        });
        overlay.addEventListener('mousemove', (ev) => {
          if (!dragging || !ghost) return;
          const p = toNorm(ev.clientX, ev.clientY);
          const x = Math.min(start.x, p.x);
          const y = Math.min(start.y, p.y);
          const w = Math.abs(p.x - start.x);
          const h = Math.abs(p.y - start.y);
          ghost.style.left = `${x * viewport.width}px`;
          ghost.style.top = `${y * viewport.height}px`;
          ghost.style.width = `${w * viewport.width}px`;
          ghost.style.height = `${h * viewport.height}px`;
        });
        const endDrag = (ev: MouseEvent) => {
          if (!dragging) return;
          dragging = false;
          const p = toNorm(ev.clientX, ev.clientY);
          const x = Math.min(start.x, p.x);
          const y = Math.min(start.y, p.y);
          const w = Math.abs(p.x - start.x);
          const h = Math.abs(p.y - start.y);
          if (ghost && ghost.parentElement) ghost.parentElement.removeChild(ghost);
          ghost = null;
          // mínimo de 3px para evitar cliques acidentais
          const minW = 3 / viewport.width;
          const minH = 3 / viewport.height;
          if (w >= minW && h >= minH) {
            setAnns((prev) => ({ ...prev, highlights: [...prev.highlights, { page: i, x, y, w, h }] }));
          }
        };
        overlay.addEventListener('mouseup', endDrag);
        overlay.addEventListener('mouseleave', (ev) => { if (dragging) endDrag(ev as any); });
        overlay.addEventListener('dblclick', (ev) => {
          const p = toNorm(ev.clientX, ev.clientY);
          const text = window.prompt('Novo comentário');
          if (text != null) {
            setAnns((prev) => ({ ...prev, comments: [...prev.comments, { page: i, x: p.x, y: p.y, text }] }));
          }
        });
      }
    })();
  }, [pdf, anns]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-ys-ink-2">
        <div>Anotações: {anns.highlights.length} marca(s), {anns.comments.length} comentário(s)</div>
        <div>{isSaving ? 'Salvando…' : ''}</div>
      </div>
      <div ref={containerRef} className="min-h-[420px] flex-1 overflow-auto" />
    </div>
  );
}

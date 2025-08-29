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
          overlay.appendChild(pin);
        }
      }
    })();
  }, [pdf, anns]);

  return <div ref={containerRef} className="h-full overflow-auto" />;
}

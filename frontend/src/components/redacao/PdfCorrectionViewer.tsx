import { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjsLib, ensureWorker } from '@/lib/pdf';
import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';
import type { AnnotationItem, NormalizedRect } from './annotationTypes';
import type { ScrollLockControls } from '@/hooks/useScrollLock';

type PdfCorrectionViewerProps = {
  fileUrl: string | null;
  annotations: AnnotationItem[];
  selectedId: string | null;
  activeCategory: HighlightCategoryKey;
  onCreateAnnotation: (page: number, rect: NormalizedRect) => void;
  onMoveAnnotation: (id: string, rect: NormalizedRect) => void;
  onSelectAnnotation: (id: string) => void;
  disabled?: boolean;
  actions?: {
    onBack: () => void;
    onOpenOriginal: () => void;
    onSave: () => void;
    onGenerate: () => void;
    saving?: boolean;
    generating?: boolean;
  };
  scrollLock?: ScrollLockControls;
};

type DrawingState = {
  page: number;
  origin: { x: number; y: number };
  current: { x: number; y: number };
};

type DragState = {
  id: string;
  page: number;
  offsetX: number;
  offsetY: number;
  size: { width: number; height: number };
};



function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toCssRect(rect: NormalizedRect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}

export function PdfCorrectionViewer({
  fileUrl,
  annotations,
  selectedId,
  activeCategory,
  onCreateAnnotation,
  onMoveAnnotation,
  onSelectAnnotation,
  disabled,
  scrollLock,
}: PdfCorrectionViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const loadingTaskRef = useRef<any>(null);
  const destroyPromiseRef = useRef<Promise<void> | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<Record<number, any>>({});
  const annRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Re-render trigger on viewport/resize changes
  const [viewportVersion, setViewportVersion] = useState(0);

  function debounce<T extends (...args: any[]) => void>(fn: T, wait = 150) {
    let t: any;
    return (...args: Parameters<T>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  const printing = typeof document !== 'undefined' && document.documentElement.getAttribute('data-printing') === '1';

  useEffect(() => {
    let cancelled = false;
    if (!fileUrl) {
      setPdfDoc(null);
      setNumPages(0);
      pdfDocRef.current = null;
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        if (destroyPromiseRef.current) {
          try {
            await destroyPromiseRef.current;
          } catch (err) {
            console.warn('[PdfCorrectionViewer] Failed to finalize previous PDF task', err);
          }
        }
        if (pdfDocRef.current && typeof pdfDocRef.current.destroy === 'function') {
          destroyPromiseRef.current = pdfDocRef.current.destroy().catch(() => {});
          pdfDocRef.current = null;
          if (destroyPromiseRef.current) {
            try {
              await destroyPromiseRef.current;
            } catch (err) {
              console.warn('[PdfCorrectionViewer] Failed to destroy previous document', err);
            }
          }
        }
        ensureWorker();
        const task = pdfjsLib.getDocument({ url: fileUrl, withCredentials: true });
        loadingTaskRef.current = task;
        const doc = await task.promise;
        loadingTaskRef.current = null;
        if (cancelled) {
          destroyPromiseRef.current = doc.destroy().catch(() => {});
          await destroyPromiseRef.current;
          return;
        }
        pdfDocRef.current = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (cancelled) return;
        console.error('[PdfCorrectionViewer] Failed to load document', err);
        setError('Não foi possível carregar o PDF. Use o botão “Abrir original”.');
        setPdfDoc(null);
        setNumPages(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task && typeof task.destroy === 'function') {
        destroyPromiseRef.current = task.destroy().catch(() => {});
      } else if (pdfDocRef.current && typeof pdfDocRef.current.destroy === 'function') {
        destroyPromiseRef.current = pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    const onResize = debounce(() => setViewportVersion((v) => v + 1), 150);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    let cancelled = false;

    async function renderPage(pageNumber: number) {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!page || cancelled) return;

        // Fit-width: escala derivada da largura disponível do container da página
        const container = pageRefs.current[pageNumber];
        if (!container) return;
        const availableWidth = container.clientWidth || container.getBoundingClientRect().width || 0;
        const rotation = (page as any).rotate ?? 0;
        const viewport1x = page.getViewport({ scale: 1, rotation });
        const scale = Math.max(0.1, Math.min(4, availableWidth / viewport1x.width));
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRefs.current[pageNumber];
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        // HiDPI: renderiza no DPR para nitidez, mantendo CSS no tamanho lógico
        const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        renderTasksRef.current[pageNumber] = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (!cancelled) {
          console.error(`[PdfCorrectionViewer] Failed to render page ${pageNumber}`, err);
        }
      }
    }

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      renderPage(pageNumber);
    }

    return () => {
      cancelled = true;
      Object.values(renderTasksRef.current).forEach((task) => {
        try {
          task?.cancel?.();
        } catch {
          /* ignore */
        }
      });
      renderTasksRef.current = {};
    };
  }, [pdfDoc, numPages, fileUrl, viewportVersion]);

  const byPage = useMemo(() => {
    const map = new Map<number, AnnotationItem[]>();
    for (const ann of annotations) {
      if (!map.has(ann.page)) map.set(ann.page, []);
      map.get(ann.page)!.push(ann);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const na = typeof a.number === 'number' ? a.number : Number.POSITIVE_INFINITY;
        const nb = typeof b.number === 'number' ? b.number : Number.POSITIVE_INFINITY;
        if (na !== nb) return na - nb;
        return a.id.localeCompare(b.id);
      });
    }
    return map;
  }, [annotations]);

  const idToPage = useMemo(() => {
    const m = new Map<string, number>();
    for (const [pageNo, list] of byPage.entries()) {
      for (const a of list) m.set(a.id, pageNo);
    }
    return m;
  }, [byPage]);


  useEffect(() => {
    if (!selectedId || scrollLock?.isLocked?.()) return;
    const el = annRefs.current[selectedId];
    if (el) {
      // scroll the highlight into view (centro do contêiner rolável)
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch {
        // no-op
      }
      return;
    }
    // Fallback: tenta rolar para a página caso o overlay ainda não exista
    const pageNo = idToPage.get(selectedId);
    if (pageNo) {
      const pageEl = pageRefs.current[pageNo];
      try {
        pageEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handlePointerDown = (pageNumber: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const container = pageRefs.current[pageNumber];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setDrawing({
      page: pageNumber,
      origin: { x, y },
      current: { x, y },
    });
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (pageNumber: number, event: React.PointerEvent) => {
    const container = pageRefs.current[pageNumber];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    if (drawing && drawing.page === pageNumber) {
      setDrawing((prev) =>
        prev && prev.page === pageNumber ? { ...prev, current: { x, y } } : prev
      );
    }

    if (dragging && dragging.page === pageNumber) {
      const nx = clamp(x - dragging.offsetX, 0, 1 - dragging.size.width);
      const ny = clamp(y - dragging.offsetY, 0, 1 - dragging.size.height);
      onMoveAnnotation(dragging.id, { x: nx, y: ny, ...dragging.size });
    }
  };

  const handlePointerUp = (pageNumber: number, event: React.PointerEvent) => {
    if (drawing && drawing.page === pageNumber) {
      const { origin, current } = drawing;
      const width = Math.abs(current.x - origin.x);
      const height = Math.abs(current.y - origin.y);
      if (width > 0.01 && height > 0.005) {
        const rect: NormalizedRect = {
          x: Math.min(origin.x, current.x),
          y: Math.min(origin.y, current.y),
          width,
          height,
        };
        onCreateAnnotation(pageNumber, rect);
      }
      setDrawing(null);
    }
    if (dragging && dragging.page === pageNumber) {
      setDragging(null);
    }
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* ignore when capture not held */
    }
  };

  const startDragging = (ann: AnnotationItem, event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (disabled) return;
    const container = pageRefs.current[ann.page];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const firstRect = ann.rects[0];
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setDragging({
      id: ann.id,
      page: ann.page,
      offsetX: clamp(x - firstRect.x, 0, firstRect.width),
      offsetY: clamp(y - firstRect.y, 0, firstRect.height),
      size: { width: firstRect.width, height: firstRect.height },
    });
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const cancelDrawing = () => setDrawing(null);

  if (error) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
        Carregando PDF…
      </div>
    );
  }

  if (!pdfDoc || numPages === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
        Nenhum PDF disponível.
      </div>
    );
  }

  const previewColor = hexToRgba(HIGHLIGHT_CATEGORIES[activeCategory].color, HIGHLIGHT_ALPHA);

  return (
    <div className="w-full min-w-0 max-w-none min-h-0">
      <div
        className="pdf-a4-viewport space-y-3"
        style={{ ['--pdf-viewport-offset' as any]: '170px', ['--pdf-min-height' as any]: '700px' }}
      >
        {Array.from({ length: numPages }, (_, index) => {
        const pageNumber = index + 1;
        const pageAnnotations = byPage.get(pageNumber) ?? [];
        const drawingRect =
          drawing && drawing.page === pageNumber
            ? {
                x: Math.min(drawing.origin.x, drawing.current.x),
                y: Math.min(drawing.origin.y, drawing.current.y),
                width: Math.abs(drawing.current.x - drawing.origin.x),
                height: Math.abs(drawing.current.y - drawing.origin.y),
              }
            : null;
        return (
          <div
            key={pageNumber}
            className="relative w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow"
            ref={(el) => {
              pageRefs.current[pageNumber] = el;
            }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[pageNumber] = el;
              }}
              className="block w-full"
            />
            <div
              className={`absolute inset-0 ${disabled || printing ? 'cursor-default' : 'cursor-crosshair'}`}
              style={{ pointerEvents: disabled || printing ? 'none' : 'auto' }}
              onPointerDown={(event) => handlePointerDown(pageNumber, event)}
              onPointerMove={(event) => handlePointerMove(pageNumber, event)}
              onPointerUp={(event) => handlePointerUp(pageNumber, event)}
              onPointerLeave={() => cancelDrawing()}
              role="presentation"
            >
              {pageAnnotations.map((ann, annIndex) =>
                ann.rects.map((rect, idx) => {
                  const style = toCssRect(rect);
                  const color = hexToRgba(ann.color, HIGHLIGHT_ALPHA);
                  return (
                    <div
                      key={`${ann.id}-${idx}`}
                      ref={(node) => {
                        if (idx === 0) annRefs.current[ann.id] = node;
                      }}
                      data-annotation-id={ann.id}
                      className={`absolute rounded-md border border-orange-400/40 shadow-inner transition ${
                        selectedId === ann.id ? 'ring-2 ring-orange-500' : ''
                      }`}
                      style={{
                        ...style,
                        backgroundColor: color,
                      }}
                      onPointerDown={(event) => startDragging(ann, event)}
                      onPointerMove={(event) => handlePointerMove(pageNumber, event)}
                      onPointerUp={(event) => handlePointerUp(pageNumber, event)}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectAnnotation(ann.id);
                      }}
                    >
                      <span className="absolute left-1 top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-slate-800 shadow">
                        {`#${typeof ann.number === 'number' ? ann.number : (annIndex + 1)}`}
                      </span>
                    </div>
                  );
                })
              )}
              {drawingRect && (
                <div
                  className="absolute rounded-md border border-dashed border-orange-500/80"
                  style={{
                    ...toCssRect(drawingRect),
                    backgroundColor: previewColor,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default PdfCorrectionViewer;

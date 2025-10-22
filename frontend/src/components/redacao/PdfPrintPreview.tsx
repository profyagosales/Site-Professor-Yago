import { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjsLib } from '@/lib/pdf';
import type { AnnotationItem } from './annotationTypes';
import { hexToRgba } from '@/utils/color';

type PdfPrintPreviewProps = {
  fileUrl: string | null;
  annotations: AnnotationItem[];
  categoryColors: Record<string, string>;
  overlayAlpha?: number;
  maxPages?: number | null;
};

type PageMeta = {
  width: number;
  height: number;
};

const PRINT_SCALE = 1.5;

export function PdfPrintPreview({
  fileUrl,
  annotations,
  categoryColors,
  overlayAlpha = 0.26,
  maxPages = 1,
}: PdfPrintPreviewProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<Record<number, PageMeta>>({});

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const destroyRef = useRef<Promise<void> | null>(null);
  const loadingTaskRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      if (!fileUrl) {
        setPdfDoc(null);
        setNumPages(0);
        setPageMeta({});
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (destroyRef.current) {
          try {
            await destroyRef.current;
          } catch {
            /* ignore */
          } finally {
            destroyRef.current = null;
          }
        }
        const task = pdfjsLib.getDocument({ url: fileUrl, withCredentials: true });
        loadingTaskRef.current = task;
        const doc = await task.promise;
        if (cancelled) {
          destroyRef.current = doc.destroy();
          return;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) {
          console.error('[PdfPrintPreview] Failed to load PDF', err);
          setError('Não foi possível carregar a redação.');
          setPdfDoc(null);
          setNumPages(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadingTaskRef.current = null;
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      setLoading(false);
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          /* ignore */
        } finally {
          loadingTaskRef.current = null;
        }
      }
      if (pdfDoc && typeof pdfDoc.destroy === 'function') {
        destroyRef.current = pdfDoc.destroy();
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    let cancelled = false;

    (async () => {
      const renderPromises: Promise<void>[] = [];
      const pagesToRender =
        typeof maxPages === 'number' && Number.isFinite(maxPages) && maxPages > 0
          ? Math.min(maxPages, numPages)
          : numPages;

      for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
        renderPromises.push(
          (async () => {
            try {
              const page = await pdfDoc.getPage(pageNumber);
              if (!page || cancelled) return;
              const viewport = page.getViewport({ scale: PRINT_SCALE });
              const canvas = canvasRefs.current[pageNumber];
              if (!canvas) return;
              const context = canvas.getContext('2d', { alpha: false });
              if (!context) return;

              canvas.width = viewport.width;
              canvas.height = viewport.height;

              canvas.style.width = '100%';
              canvas.style.height = '100%';

              setPageMeta((prev) => ({
                ...prev,
                [pageNumber]: { width: viewport.width, height: viewport.height },
              }));

              const renderTask = page.render({ canvasContext: context, viewport });
              await renderTask.promise;
            } catch (err) {
              if (!cancelled) {
                console.error(`[PdfPrintPreview] Failed to render page ${pageNumber}`, err);
              }
            }
          })(),
        );
      }

      await Promise.all(renderPromises);
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, numPages, maxPages]);

  const annotationsByPage = useMemo(() => {
    const grouped = new Map<number, AnnotationItem[]>();
    annotations.forEach((ann) => {
      if (!grouped.has(ann.page)) grouped.set(ann.page, []);
      grouped.get(ann.page)!.push(ann);
    });
    grouped.forEach((list) => list.sort((a, b) => a.number - b.number));
    return grouped;
  }, [annotations]);

  if (!fileUrl) {
    return <div className="placeholder">Redação não disponível.</div>;
  }

  if (loading) {
    return <div className="loading-state">Carregando redação…</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  if (!numPages) {
    return <div className="placeholder">Nenhuma página encontrada no arquivo.</div>;
  }

  const pages =
    typeof maxPages === 'number' && Number.isFinite(maxPages) && maxPages > 0
      ? Math.min(maxPages, numPages)
      : numPages;

  return (
    <div className="pdf-pages">
      {Array.from({ length: pages }, (_, index) => {
        const pageNumber = index + 1;
        const meta = pageMeta[pageNumber];
        const aspectRatio =
          meta && meta.width && meta.height ? `${meta.width} / ${meta.height}` : undefined;
        const pageAnnotations = annotationsByPage.get(pageNumber) ?? [];
        return (
          <div
            key={pageNumber}
            className="pdf-page"
            style={aspectRatio ? { aspectRatio } : undefined}
          >
            <canvas ref={(el) => { canvasRefs.current[pageNumber] = el; }} />
            <div className="pdf-overlay">
              {pageAnnotations.flatMap((ann) =>
                ann.rects.map((rect, idx) => {
                  const baseColor = categoryColors[ann.category] ?? '#fde68a';
                  return (
                    <div
                      key={`${ann.id}-${idx}`}
                      className="pdf-highlight"
                      style={{
                        left: `${rect.x * 100}%`,
                        top: `${rect.y * 100}%`,
                        width: `${rect.width * 100}%`,
                        height: `${rect.height * 100}%`,
                        backgroundColor: hexToRgba(baseColor, overlayAlpha),
                        boxShadow: `0 0 0 1px ${hexToRgba('#0f172a', 0.06)}`,
                      }}
                    />
                  );
                }),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PdfPrintPreview;

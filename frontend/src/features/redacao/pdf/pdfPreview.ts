import { pdfjsLib } from '@/lib/pdf';

async function fetchAsUint8Array(source: string | Uint8Array | Blob): Promise<Uint8Array | null> {
  if (source instanceof Uint8Array) return source;
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    try {
      const ab = await source.arrayBuffer();
      return new Uint8Array(ab);
    } catch (err) {
      console.error('[pdfPreview] Failed to read Blob', err);
      return null;
    }
  }
  try {
    const res = await fetch(source as string, { credentials: 'include' });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.error('[pdfPreview] Failed to fetch PDF', err);
    return null;
  }
}

export type PreviewOptions = {
  /** Largura máxima, em px, para a imagem final. Padrão: 1200 */
  maxWidth?: number;
  /** Página a renderizar (1-based). Padrão: 1 */
  page?: number;
  /** Fator de pixels (HiDPI). Padrão: 1 */
  pixelRatio?: number;
};

export async function renderFirstPageToPng(
  pdfUrlOrBytes: string | Uint8Array | Blob,
  maxWidthOrOptions: number | PreviewOptions = 1200,
): Promise<string | null> {
  try {
    const bytes = await fetchAsUint8Array(pdfUrlOrBytes);
    if (!bytes) return null;

    // Garantir worker quando necessário (fallback suave)
    try {
      const anyPdf: any = pdfjsLib as any;
      if (anyPdf?.GlobalWorkerOptions && !anyPdf.GlobalWorkerOptions.workerSrc) {
        // script copy-pdf-worker.cjs copia para /public/
        anyPdf.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
    } catch {
      // ignora
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const doc = await loadingTask.promise;
    try {
      const opts: PreviewOptions =
        typeof maxWidthOrOptions === 'number'
          ? { maxWidth: maxWidthOrOptions }
          : (maxWidthOrOptions || {});

      const maxWidth = Math.max(200, opts.maxWidth ?? 1200);
      const pageNumber = Math.max(1, Math.floor(opts.page ?? 1));
      const pixelRatio = Math.max(1, Math.min(3, opts.pixelRatio ?? 1));

      const page = await doc.getPage(pageNumber);
      const viewport1x = page.getViewport({ scale: 1 });
      const scale = Math.max(0.1, Math.min(4, maxWidth / viewport1x.width));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Suporte HiDPI opcional
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      // Ajusta a escala do contexto para desenhar na densidade correta
      if (pixelRatio !== 1) {
        ctx.scale(pixelRatio, pixelRatio);
      }

      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;

      return canvas.toDataURL('image/png');
    } finally {
      await doc.destroy();
    }
  } catch (err) {
    console.error('[pdfPreview] Failed to render first page', err);
    return null;
  }
}

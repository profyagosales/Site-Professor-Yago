import { pdfjsLib } from '@/lib/pdf';

async function fetchAsUint8Array(source: string | Uint8Array): Promise<Uint8Array | null> {
  if (source instanceof Uint8Array) return source;
  try {
    const res = await fetch(source, { credentials: 'include' });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.error('[pdfPreview] Failed to fetch PDF', err);
    return null;
  }
}

export async function renderFirstPageToPng(
  pdfUrlOrBytes: string | Uint8Array,
  maxWidth: number,
): Promise<string | null> {
  try {
    const bytes = await fetchAsUint8Array(pdfUrlOrBytes);
    if (!bytes) return null;

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const doc = await loadingTask.promise;
    try {
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const scale = maxWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);

      const renderTask = page.render({ canvasContext: context, viewport: scaledViewport });
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

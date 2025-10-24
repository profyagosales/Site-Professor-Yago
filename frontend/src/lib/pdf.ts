import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

/**
 * Garante a configuração do worker do pdf.js.
 * Preferimos o worker ESM servido de /public (copy-pdf-worker.cjs),
 * e caímos para o workerPort (module) como fallback.
 */
export function ensureWorker() {
  if (workerConfigured) return;

  // Evita rodar em SSR / build
  if (typeof window === 'undefined') return;

  // 1) Prefer /pdf.worker.min.mjs copiado para /public
  try {
    const anyPdf: any = pdfjsLib as any;
    if (anyPdf?.GlobalWorkerOptions) {
      anyPdf.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      workerConfigured = true;
      return;
    }
  } catch {
    // continua para fallback
  }

  // 2) Fallback: module worker do pacote
  try {
    if (typeof Worker !== 'undefined') {
      const PdfWorker = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' }
      );
      (pdfjsLib as any).GlobalWorkerOptions.workerPort = PdfWorker;
      workerConfigured = true;
      return;
    }
  } catch (err) {
    console.error('[pdf] Failed to initialize pdf.js worker', err);
  }
}

// Configura imediatamente em ambiente de browser
ensureWorker();

export { pdfjsLib };

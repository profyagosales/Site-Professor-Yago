import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

function ensureWorker() {
  if (workerConfigured) return;
  try {
    const PdfWorker = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
      { type: 'module' }
    );
    (pdfjsLib as any).GlobalWorkerOptions.workerPort = PdfWorker;
    workerConfigured = true;
  } catch (err) {
    console.error('[pdf] Failed to initialize pdf.js worker', err);
    throw err;
  }
}

ensureWorker();

export { pdfjsLib };

export async function ensurePdfWorker() {
  if (typeof window === 'undefined') return;
  if ((window as any).__PDF_WORKER_READY) return;
  try {
    const { pdfjs } = await import('react-pdf');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.js?worker&url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    (window as any).__PDF_WORKER_READY = true;
  } catch (err) {
    console.error('pdf worker setup failed', err);
  }
}

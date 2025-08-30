export async function ensurePdfWorker() {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}

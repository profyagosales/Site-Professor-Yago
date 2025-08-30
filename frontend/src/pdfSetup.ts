import { pdfjs } from 'react-pdf';

let configured = false;
export function ensurePdfWorker() {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  configured = true;
}

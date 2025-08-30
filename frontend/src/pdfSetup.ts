export function ensurePdfWorker() {
  if ((window as any).__pdfjs_ready) return;
  const w = document.createElement('script');
  // Aponte para o worker que o build do pdf.js copia para /assets/
  w.src = '/assets/pdf.worker.min.js';
  w.type = 'module';
  document.head.appendChild(w);
  (window as any).__pdfjs_ready = true;
}

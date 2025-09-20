// Carrega e configura o worker de pdf.js apenas quando necessário
export async function ensurePdfWorker() {
  const moduleName = ['pdfjs', 'dist'].join('-') + '/build/pdf';
  const pdfjs = await import(moduleName);
  // aponta para o arquivo servido pelo Vite/Vercel
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

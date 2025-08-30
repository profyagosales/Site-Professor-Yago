let configured = false;

/** Configura o worker do pdf.js somente quando chamado. */
export async function ensurePdfWorker() {
  if (configured) return;
  const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf'); // dynamic + legacy
  const pdfjs: any = (pdfjsMod as any).default ?? pdfjsMod;
  // Gera URL do worker a partir do bundle (Vite resolve para /assets/pdf.worker.min-*.js)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdf.worker.min.js',
    import.meta.url
  ).toString();
  configured = true;
}


import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/viewer/pdf.worker.mjs";

export default function Viewer() {
  const [src, setSrc] = useState<{ url: string; httpHeaders?: any } | null>(null);

  useEffect(() => {
    const onOpen = (e: any) => setSrc({ url: e.detail.url, httpHeaders: e.detail.headers });
    window.addEventListener("pdf:open", onOpen);
    return () => window.removeEventListener("pdf:open", onOpen);
  }, []);

  if (!src) return <div style={{ padding: 16 }}>Carregando...</div>;
  return (
    <Document file={src}>
      <Page pageNumber={1} />
    </Document>
  );
}

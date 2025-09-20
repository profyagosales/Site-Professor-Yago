import { useEffect, useRef, useState } from 'react';

interface Props {
  fileUrl: string;
  meta: any;
}

export default function Viewer({ fileUrl, meta }: Props) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load do react-pdf para evitar carregar em outras páginas
  function useReactPdf() {
    const [RP, setRP] = useState<any>(null);
    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const m = await import('react-pdf');
          m.pdfjs.GlobalWorkerOptions.workerSrc = '/viewer/pdf.worker.min.js';
          if (active) setRP(m);
        } catch (e) {
          console.error('Falha ao carregar react-pdf', e);
        }
      })();
      return () => { active = false; };
    }, []);
    return RP;
  }
  const RP = useReactPdf();

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    window.parent.postMessage({ type: 'loaded' }, window.location.origin);
    setTimeout(sendHeight, 0);
  }

  function sendHeight() {
    const h = containerRef.current?.scrollHeight || 0;
    window.parent.postMessage({ type: 'height', value: h }, window.location.origin);
  }

  if (!RP) {
    return <div className="p-4 text-muted-foreground">Carregando visualizador…</div>;
  }
  const { Document, Page } = RP;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
  <Document file={fileUrl} onLoadSuccess={onLoadSuccess} onLoadError={(e: any)=> window.parent.postMessage({type:'error', message:String((e?.message) || e)}, window.location.origin)}>
        {Array.from({ length: numPages }, (_, i) => (
          <Page key={i+1} pageNumber={i+1} width={600} />
        ))}
      </Document>
    </div>
  );
}

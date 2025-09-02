import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

// Configurar worker com caminho correto para os assets do viewer
pdfjs.GlobalWorkerOptions.workerSrc = '/viewer/assets/pdf.worker.min.js';

interface Props {
  fileSource: string | { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean };
  meta?: any;
}

export default function Viewer({ fileSource }: Props) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    window.parent.postMessage({ type: 'loaded' }, window.location.origin);
    setTimeout(sendHeight, 0);
  }

  function sendHeight() {
    const h = containerRef.current?.scrollHeight || 0;
    window.parent.postMessage({ type: 'height', value: h }, window.location.origin);
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Document
        file={fileSource}
        onLoadSuccess={onLoadSuccess}
        onLoadError={(e) =>
          window.parent.postMessage(
            { type: 'error', message: String(e.message || e) },
            window.location.origin,
          )
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page key={i + 1} pageNumber={i + 1} width={600} />
        ))}
      </Document>
    </div>
  );
}

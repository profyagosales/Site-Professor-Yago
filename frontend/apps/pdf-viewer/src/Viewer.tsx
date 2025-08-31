import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

interface Props {
  fileUrl: string;
  meta: any;
}

export default function Viewer({ fileUrl, meta }: Props) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/viewer/pdf.worker.mjs';
  }, []);

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
        file={{ url: fileUrl, httpHeaders: meta?.token ? { Authorization: `Bearer ${meta.token}` } : undefined }}
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

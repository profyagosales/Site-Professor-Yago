import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

interface Props {
  fileSource: string | { url: string; httpHeaders?: Record<string, string> };
  meta?: any;
}

export default function Viewer({ fileSource }: Props) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
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

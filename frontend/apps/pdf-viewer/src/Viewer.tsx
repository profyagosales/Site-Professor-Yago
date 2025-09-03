import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

GlobalWorkerOptions.workerSrc = '/viewer/pdf.worker.mjs';

type FileSource = string | { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean };

export default function Viewer() {
  const [file, setFile] = useState<FileSource | null>(null);
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (!ev?.data || ev.data.type !== 'open') return;
      const { url, token } = ev.data.payload || {};
      setFile({
        url,
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: false,
      });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    window.parent.postMessage({ type: 'loaded' }, '*');
    setTimeout(sendHeight, 0);
  }

  function sendHeight() {
    const h = containerRef.current?.scrollHeight || 0;
    window.parent.postMessage({ type: 'height', value: h }, '*');
  }

  if (!file) return <div className="p-4 text-sm">Aguardando arquivo…</div>;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        onLoadError={(e) =>
          window.parent.postMessage({ type: 'error', message: String(e.message || e) }, '*')
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page key={i + 1} pageNumber={i + 1} width={600} />
        ))}
      </Document>
    </div>
  );
}

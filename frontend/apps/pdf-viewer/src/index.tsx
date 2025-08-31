import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Viewer from './Viewer';

type FileSource = string | { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean };

function App() {
  const [fileSource, setFileSource] = useState<FileSource | null>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type, file, fileUrl, meta } = event.data || {};
      if (type === 'open' || type === 'open-pdf') {
        const url = file || fileUrl;
        setMeta(meta);
        if (meta?.token) {
          setFileSource({
            url,
            httpHeaders: { Authorization: `Bearer ${meta.token}` },
            withCredentials: true,
          });
        } else {
          setFileSource(url);
        }
      }
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!fileSource) return <div className="p-4 text-sm">Aguardando arquivo…</div>;

  return <Viewer fileSource={fileSource} meta={meta} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

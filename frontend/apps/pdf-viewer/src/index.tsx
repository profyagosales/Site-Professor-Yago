import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Viewer from './Viewer';

function App() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.type === 'open' || msg?.type === 'open-pdf') {
        setFileUrl(msg.fileUrl || msg.url);
        setMeta(msg.meta);
      }
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!fileUrl) return <div className="p-4 text-sm">Aguardando arquivo…</div>;

  return <Viewer fileUrl={fileUrl} meta={meta} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/viewer/pdf.worker.mjs";

export default function Viewer() {
  const [src, setSrc] = useState<{ url: string; httpHeaders?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onOpen = (e: any) => {
      setError(null);
      setLoading(true);
      setSrc({ url: e.detail.url, httpHeaders: e.detail.headers });
    };
    window.addEventListener("pdf:open", onOpen);
    return () => window.removeEventListener("pdf:open", onOpen);
  }, []);

  const onDocumentLoadSuccess = () => {
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: any) => {
    setLoading(false);
    console.error('PDF load error:', error);
    if (error.message?.includes('401')) {
      setError('Acesso negado ao arquivo PDF');
    } else if (error.message?.includes('404')) {
      setError('Arquivo PDF não encontrado');
    } else if (error.message?.includes('WorkerMessageHandler')) {
      setError('Erro no processamento do PDF - tente recarregar a página');
    } else {
      setError('Erro ao carregar PDF');
    }
  };

  if (!src) return <div style={{ padding: 16 }}>Aguardando arquivo PDF...</div>;
  
  if (error) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#dc2626' }}>
        <div style={{ marginBottom: 8 }}>❌ {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <Document 
      file={src} 
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={onDocumentLoadError}
      loading={<div style={{ padding: 16 }}>Carregando PDF...</div>}
    >
      <Page pageNumber={1} />
    </Document>
  );
}

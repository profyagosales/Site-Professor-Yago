import { useState } from 'react';
import { essayService } from '../../services/essayService';

interface EmailSendProps {
  essayId: string;
  onSuccess?: () => void;
  lastSentAt?: Date | null;
}

export function EmailSendButton({ essayId, onSuccess, lastSentAt }: EmailSendProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sendEmail = async () => {
    try {
      setSending(true);
      setError(null);
      
      await essayService.sendEmailWithPdf(essayId);
      
      // Chamar callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail');
      console.error('Erro ao enviar e-mail:', err);
    } finally {
      setSending(false);
    }
  };
  
  // Formatar a data do último envio
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Nunca enviado';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const buttonText = lastSentAt ? 'Reenviar' : 'Enviar por e-mail';
  
  return (
    <div className="flex flex-col items-start">
      <button
        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1 disabled:bg-gray-400"
        onClick={sendEmail}
        disabled={sending}
      >
        {sending ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>{buttonText}</span>
          </>
        )}
      </button>
      
      {lastSentAt && (
        <span className="text-xs text-gray-500 mt-1">
          Último envio: {formatDate(lastSentAt)}
        </span>
      )}
      
      {error && (
        <span className="text-xs text-red-500 mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
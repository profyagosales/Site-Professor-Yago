/**
 * Hook para gerenciamento de PDF corrigido
 * 
 * Funcionalidades:
 * - Geração de PDF com polling
 * - Download e abertura de arquivos
 * - Estados de loading e erro
 * - Limpeza automática de recursos
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  generateCorrectedPdfWithPolling,
  type EssayTheme 
} from '@/services/essays.service';
import { 
  downloadBlob, 
  openBlobInNewTab, 
  createBlobUrl, 
  revokeBlobUrl,
  getBlobInfo,
  type BlobDownloadManager
} from '@/utils/downloadBlob';

export interface UseCorrectedPdfOptions {
  // Configurações de polling
  pollInterval?: number; // ms entre verificações (padrão: 2000)
  maxPollTime?: number; // tempo máximo de polling (padrão: 20000)
  
  // Comportamento
  showToasts?: boolean;
  enableLogging?: boolean;
}

export interface UseCorrectedPdfReturn {
  // Estados
  isGenerating: boolean;
  isDownloading: boolean;
  isOpening: boolean;
  error: string | null;
  status: string | null;
  
  // Dados
  generatedPdf: Blob | null;
  pdfUrl: string | null;
  pdfInfo: {
    size: number;
    type: string;
    sizeFormatted: string;
    extension: string;
  } | null;
  
  // Ações
  generatePdf: (essayId: string) => Promise<void>;
  downloadPdf: () => Promise<void>;
  openPdf: () => Promise<void>;
  clearError: () => void;
  cleanup: () => void;
  
  // Utilitários
  canDownload: boolean;
  canOpen: boolean;
}

export function useCorrectedPdf(options: UseCorrectedPdfOptions = {}): UseCorrectedPdfReturn {
  const {
    pollInterval = 2000,
    maxPollTime = 20000,
    showToasts = true,
    enableLogging = true,
  } = options;

  // Estados
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{
    size: number;
    type: string;
    sizeFormatted: string;
    extension: string;
  } | null>(null);

  // Refs para controle
  const downloadManagerRef = useRef<BlobDownloadManager | null>(null);

  // Dados derivados
  const canDownload = !!generatedPdf;
  const canOpen = !!generatedPdf;

  // Gerar PDF corrigido
  const generatePdf = useCallback(async (essayId: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      setStatus('Iniciando geração do PDF...');
      
      if (enableLogging) {
        console.log('Iniciando geração de PDF corrigido', { essayId });
      }

      const blob = await generateCorrectedPdfWithPolling(essayId, {
        pollInterval,
        maxPollTime,
        onStatusUpdate: (statusMessage) => {
          setStatus(statusMessage);
        },
      });

      setGeneratedPdf(blob);
      setStatus('PDF gerado com sucesso!');
      
      // Cria URL temporária para abertura
      const url = createBlobUrl(blob);
      setPdfUrl(url);
      
      // Obtém informações do blob
      const info = getBlobInfo(blob);
      setPdfInfo(info);
      
      if (enableLogging) {
        console.log('PDF corrigido gerado com sucesso', {
          essayId,
          size: info.size,
          type: info.type,
        });
      }
      
      if (showToasts) {
        toast.success(`PDF corrigido gerado com sucesso (${info.sizeFormatted})`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF corrigido';
      setError(errorMessage);
      setStatus('Erro na geração do PDF');
      
      if (enableLogging) {
        console.error('Erro ao gerar PDF corrigido', {
          essayId,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [pollInterval, maxPollTime, showToasts, enableLogging]);

  // Download do PDF
  const downloadPdf = useCallback(async () => {
    if (!generatedPdf) return;

    try {
      setIsDownloading(true);
      setError(null);
      
      const filename = `redacao-corrigida-${Date.now()}.pdf`;
      await downloadBlob(generatedPdf, filename);
      
      if (enableLogging) {
        console.log('PDF corrigido baixado com sucesso', { filename });
      }
      
      if (showToasts) {
        toast.success('PDF corrigido baixado com sucesso');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao baixar PDF';
      setError(errorMessage);
      
      if (enableLogging) {
        console.error('Erro ao baixar PDF corrigido', { error: errorMessage });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [generatedPdf, showToasts, enableLogging]);

  // Abrir PDF em nova aba
  const openPdf = useCallback(async () => {
    if (!generatedPdf) return;

    try {
      setIsOpening(true);
      setError(null);
      
      const filename = `redacao-corrigida-${Date.now()}.pdf`;
      await openBlobInNewTab(generatedPdf, filename);
      
      if (enableLogging) {
        console.log('PDF corrigido aberto em nova aba', { filename });
      }
      
      if (showToasts) {
        toast.success('PDF corrigido aberto em nova aba');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao abrir PDF';
      setError(errorMessage);
      
      if (enableLogging) {
        console.error('Erro ao abrir PDF corrigido', { error: errorMessage });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsOpening(false);
    }
  }, [generatedPdf, showToasts, enableLogging]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Limpeza de recursos
  const cleanup = useCallback(() => {
    if (pdfUrl) {
      revokeBlobUrl(pdfUrl);
      setPdfUrl(null);
    }
    
    setGeneratedPdf(null);
    setPdfInfo(null);
    setStatus(null);
    setError(null);
    
    if (downloadManagerRef.current) {
      downloadManagerRef.current.cleanup();
    }
  }, [pdfUrl]);

  return {
    // Estados
    isGenerating,
    isDownloading,
    isOpening,
    error,
    status,
    
    // Dados
    generatedPdf,
    pdfUrl,
    pdfInfo,
    
    // Ações
    generatePdf,
    downloadPdf,
    openPdf,
    clearError,
    cleanup,
    
    // Utilitários
    canDownload,
    canOpen,
  };
}

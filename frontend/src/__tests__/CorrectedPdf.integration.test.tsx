/**
 * Testes de integração para geração de PDF corrigido
 * 
 * Funcionalidades testadas:
 * - Geração de PDF com polling
 * - Download e abertura de arquivos
 * - Estados de loading e erro
 * - Limpeza de recursos
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useCorrectedPdf } from '@/hooks/useCorrectedPdf';
import { 
  generateCorrectedPdfWithPolling,
  checkCorrectedPdfStatus 
} from '@/services/essays.service';
import { 
  downloadBlob, 
  openBlobInNewTab,
  createBlobUrl,
  revokeBlobUrl 
} from '@/utils/downloadBlob';
import { toast } from 'react-toastify';

// Mock dos serviços
jest.mock('@/services/essays.service', () => ({
  generateCorrectedPdfWithPolling: jest.fn(),
  checkCorrectedPdfStatus: jest.fn(),
}));

// Mock do downloadBlob
jest.mock('@/utils/downloadBlob', () => ({
  downloadBlob: jest.fn(),
  openBlobInNewTab: jest.fn(),
  createBlobUrl: jest.fn(),
  revokeBlobUrl: jest.fn(),
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGenerateCorrectedPdfWithPolling = generateCorrectedPdfWithPolling as jest.MockedFunction<typeof generateCorrectedPdfWithPolling>;
const mockCheckCorrectedPdfStatus = checkCorrectedPdfStatus as jest.MockedFunction<typeof checkCorrectedPdfStatus>;
const mockDownloadBlob = downloadBlob as jest.MockedFunction<typeof downloadBlob>;
const mockOpenBlobInNewTab = openBlobInNewTab as jest.MockedFunction<typeof openBlobInNewTab>;
const mockCreateBlobUrl = createBlobUrl as jest.MockedFunction<typeof createBlobUrl>;
const mockRevokeBlobUrl = revokeBlobUrl as jest.MockedFunction<typeof revokeBlobUrl>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Componente de teste
function TestComponent() {
  const {
    isGenerating,
    isDownloading,
    isOpening,
    error,
    status,
    generatedPdf,
    pdfInfo,
    generatePdf,
    downloadPdf,
    openPdf,
    clearError,
    canDownload,
    canOpen,
  } = useCorrectedPdf({
    showToasts: true,
    enableLogging: true,
  });

  return (
    <div>
      <button 
        onClick={() => generatePdf('test-essay-id')}
        disabled={isGenerating}
        data-testid="generate-pdf"
      >
        {isGenerating ? 'Gerando...' : 'Gerar PDF'}
      </button>
      
      <button 
        onClick={downloadPdf}
        disabled={!canDownload || isDownloading}
        data-testid="download-pdf"
      >
        {isDownloading ? 'Baixando...' : 'Baixar PDF'}
      </button>
      
      <button 
        onClick={openPdf}
        disabled={!canOpen || isOpening}
        data-testid="open-pdf"
      >
        {isOpening ? 'Abrindo...' : 'Abrir PDF'}
      </button>
      
      <button 
        onClick={clearError}
        data-testid="clear-error"
      >
        Limpar Erro
      </button>
      
      {isGenerating && <div data-testid="generating-status">{status}</div>}
      {error && <div data-testid="error-message">{error}</div>}
      {generatedPdf && <div data-testid="pdf-ready">PDF pronto</div>}
      {pdfInfo && <div data-testid="pdf-info">{pdfInfo.sizeFormatted}</div>}
    </div>
  );
}

describe('Corrected PDF Integration', () => {
  const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' });
  const mockUrl = 'blob:http://localhost:3000/test-url';

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBlobUrl.mockReturnValue(mockUrl);
  });

  describe('Geração de PDF', () => {
    it('deve gerar PDF com sucesso', async () => {
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('generating-status')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      expect(mockGenerateCorrectedPdfWithPolling).toHaveBeenCalledWith('test-essay-id', {
        pollInterval: 2000,
        maxPollTime: 20000,
        onStatusUpdate: expect.any(Function),
      });
    });

    it('deve mostrar erro quando geração falha', async () => {
      const errorMessage = 'Erro ao gerar PDF';
      mockGenerateCorrectedPdfWithPolling.mockRejectedValue(new Error(errorMessage));

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('deve mostrar status durante geração', async () => {
      let statusCallback: (status: string) => void;
      
      mockGenerateCorrectedPdfWithPolling.mockImplementation((id, options) => {
        statusCallback = options.onStatusUpdate!;
        return new Promise((resolve) => {
          setTimeout(() => {
            statusCallback('Processando PDF...');
            setTimeout(() => resolve(mockBlob), 100);
          }, 100);
        });
      });

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('generating-status')).toHaveTextContent('Processando PDF...');
      });
    });
  });

  describe('Download de PDF', () => {
    beforeEach(() => {
      // Simula PDF já gerado
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);
    });

    it('deve baixar PDF com sucesso', async () => {
      mockDownloadBlob.mockResolvedValue();

      render(<TestComponent />);

      // Gera PDF primeiro
      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      // Baixa PDF
      const downloadButton = screen.getByTestId('download-pdf');
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadBlob).toHaveBeenCalledWith(mockBlob, expect.stringContaining('redacao-corrigida-'));
      });

      expect(mockToast.success).toHaveBeenCalledWith('PDF corrigido baixado com sucesso');
    });

    it('deve mostrar erro quando download falha', async () => {
      const errorMessage = 'Erro ao baixar PDF';
      mockDownloadBlob.mockRejectedValue(new Error(errorMessage));

      render(<TestComponent />);

      // Gera PDF primeiro
      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      // Baixa PDF
      const downloadButton = screen.getByTestId('download-pdf');
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('deve desabilitar botão quando não há PDF', () => {
      render(<TestComponent />);

      const downloadButton = screen.getByTestId('download-pdf');
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Abertura de PDF', () => {
    beforeEach(() => {
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);
    });

    it('deve abrir PDF em nova aba com sucesso', async () => {
      mockOpenBlobInNewTab.mockResolvedValue();

      render(<TestComponent />);

      // Gera PDF primeiro
      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      // Abre PDF
      const openButton = screen.getByTestId('open-pdf');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(mockOpenBlobInNewTab).toHaveBeenCalledWith(mockBlob, expect.stringContaining('redacao-corrigida-'));
      });

      expect(mockToast.success).toHaveBeenCalledWith('PDF corrigido aberto em nova aba');
    });

    it('deve mostrar erro quando abertura falha', async () => {
      const errorMessage = 'Erro ao abrir PDF';
      mockOpenBlobInNewTab.mockRejectedValue(new Error(errorMessage));

      render(<TestComponent />);

      // Gera PDF primeiro
      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      // Abre PDF
      const openButton = screen.getByTestId('open-pdf');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('deve desabilitar botão quando não há PDF', () => {
      render(<TestComponent />);

      const openButton = screen.getByTestId('open-pdf');
      expect(openButton).toBeDisabled();
    });
  });

  describe('Gerenciamento de estado', () => {
    it('deve limpar erro quando solicitado', async () => {
      mockGenerateCorrectedPdfWithPolling.mockRejectedValue(new Error('Erro de teste'));

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      const clearButton = screen.getByTestId('clear-error');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('deve mostrar informações do PDF quando gerado', async () => {
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-info')).toBeInTheDocument();
      });
    });
  });

  describe('Polling para status 202', () => {
    it('deve fazer polling quando retorna 202', async () => {
      let statusCallback: (status: string) => void;
      let resolvePromise: (value: Blob) => void;
      
      const promise = new Promise<Blob>((resolve) => {
        resolvePromise = resolve;
      });

      mockGenerateCorrectedPdfWithPolling.mockImplementation((id, options) => {
        statusCallback = options.onStatusUpdate!;
        return promise;
      });

      mockCheckCorrectedPdfStatus
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'ready', url: 'http://example.com/pdf' });

      // Mock da resposta do PDF final
      const mockResponse = { data: mockBlob };
      const mockApiGet = jest.fn().mockResolvedValue(mockResponse);
      
      // Mock do api.get
      jest.doMock('@/services/api', () => ({
        api: {
          get: mockApiGet,
        },
      }));

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      // Simula callback de status
      act(() => {
        statusCallback('Processando PDF...');
      });

      await waitFor(() => {
        expect(screen.getByTestId('generating-status')).toHaveTextContent('Processando PDF...');
      });

      // Resolve a promise
      act(() => {
        resolvePromise(mockBlob);
      });

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });
    });
  });

  describe('Limpeza de recursos', () => {
    it('deve limpar URLs temporárias', async () => {
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);

      const { unmount } = render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-ready')).toBeInTheDocument();
      });

      unmount();

      expect(mockRevokeBlobUrl).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe('Configurações de polling', () => {
    it('deve usar configurações padrão', async () => {
      mockGenerateCorrectedPdfWithPolling.mockResolvedValue(mockBlob);

      render(<TestComponent />);

      const generateButton = screen.getByTestId('generate-pdf');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockGenerateCorrectedPdfWithPolling).toHaveBeenCalledWith('test-essay-id', {
          pollInterval: 2000,
          maxPollTime: 20000,
          onStatusUpdate: expect.any(Function),
        });
      });
    });
  });
});

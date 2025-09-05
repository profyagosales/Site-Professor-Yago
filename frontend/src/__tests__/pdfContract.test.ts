import { 
  buildPdfUrl, 
  isWorkerReady, 
  supportsInline, 
  isPdfAccessible,
  determinePdfStrategy,
  handlePdfError 
} from '@/features/viewer/pdfContract';

// Mock do fetch
global.fetch = jest.fn();

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do navigator
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
});

describe('PDF Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('buildPdfUrl', () => {
    it('deve construir URL sem token', () => {
      const url = buildPdfUrl('essay123');
      expect(url).toBe('http://localhost:5050/essays/essay123/file');
    });

    it('deve construir URL com token', () => {
      const url = buildPdfUrl('essay123', 'token456');
      expect(url).toBe('http://localhost:5050/essays/essay123/file?t=token456');
    });

    it('deve fazer encode do token corretamente', () => {
      const url = buildPdfUrl('essay123', 'token with spaces');
      expect(url).toBe('http://localhost:5050/essays/essay123/file?t=token%20with%20spaces');
    });
  });

  describe('isWorkerReady', () => {
    it('deve retornar true quando worker está disponível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isWorkerReady();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/viewer/pdf.worker.mjs', {
        method: 'HEAD',
        cache: 'no-cache',
      });
    });

    it('deve retornar false quando worker não está disponível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await isWorkerReady();
      
      expect(result).toBe(false);
    });

    it('deve retornar false quando fetch falha', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await isWorkerReady();
      
      expect(result).toBe(false);
    });
  });

  describe('supportsInline', () => {
    it('deve retornar true para desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });

      const result = supportsInline();
      expect(result).toBe(true);
    });

    it('deve retornar false para iPhone', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });

    it('deve retornar false para Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });

    it('deve retornar false para iPad', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });
  });

  describe('isPdfAccessible', () => {
    it('deve retornar true quando PDF está acessível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isPdfAccessible('essay123', 'token456');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/essays/essay123/file?t=token456',
        {
          method: 'HEAD',
          headers: { Authorization: 'Bearer token456' },
          cache: 'no-cache',
        }
      );
    });

    it('deve retornar false quando PDF não está acessível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await isPdfAccessible('essay123', 'token456');
      
      expect(result).toBe(false);
    });

    it('deve funcionar sem token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isPdfAccessible('essay123');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/essays/essay123/file',
        {
          method: 'HEAD',
          headers: {},
          cache: 'no-cache',
        }
      );
    });
  });

  describe('determinePdfStrategy', () => {
    beforeEach(() => {
      // Reset user agent para desktop
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });
    });

    it('deve retornar inline quando todas as condições são atendidas', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // worker check
        .mockResolvedValueOnce({ ok: true, status: 200 }); // accessibility check

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('inline');
    });

    it('deve retornar fallback quando worker não está pronto', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando não suporta inline', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando PDF não está acessível', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // worker check
        .mockResolvedValueOnce({ ok: false, status: 404 }); // accessibility check

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando ocorre erro', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });
  });

  describe('handlePdfError', () => {
    it('deve retornar mensagem para erro 404', () => {
      const error = { response: { status: 404 } };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Arquivo não encontrado');
    });

    it('deve retornar mensagem para erro 5xx', () => {
      const error = { response: { status: 500 } };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Falha ao carregar documento. Tente novamente.');
    });

    it('deve retornar mensagem para ERR_FAILED', () => {
      const error = { message: 'ERR_FAILED' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Falha ao carregar documento. Tente novamente.');
    });

    it('deve retornar mensagem para WorkerMessageHandler', () => {
      const error = { message: 'WorkerMessageHandler error' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Erro no processamento do PDF - tente recarregar a página');
    });

    it('deve retornar mensagem genérica para outros erros', () => {
      const error = { message: 'Unknown error' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Erro ao carregar PDF');
    });
  });
});


  buildPdfUrl, 
  isWorkerReady, 
  supportsInline, 
  isPdfAccessible,
  determinePdfStrategy,
  handlePdfError 
} from '@/features/viewer/pdfContract';

// Mock do fetch
global.fetch = jest.fn();

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do navigator
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
});

describe('PDF Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('buildPdfUrl', () => {
    it('deve construir URL sem token', () => {
      const url = buildPdfUrl('essay123');
      expect(url).toBe('http://localhost:5050/essays/essay123/file');
    });

    it('deve construir URL com token', () => {
      const url = buildPdfUrl('essay123', 'token456');
      expect(url).toBe('http://localhost:5050/essays/essay123/file?t=token456');
    });

    it('deve fazer encode do token corretamente', () => {
      const url = buildPdfUrl('essay123', 'token with spaces');
      expect(url).toBe('http://localhost:5050/essays/essay123/file?t=token%20with%20spaces');
    });
  });

  describe('isWorkerReady', () => {
    it('deve retornar true quando worker está disponível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isWorkerReady();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/viewer/pdf.worker.mjs', {
        method: 'HEAD',
        cache: 'no-cache',
      });
    });

    it('deve retornar false quando worker não está disponível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await isWorkerReady();
      
      expect(result).toBe(false);
    });

    it('deve retornar false quando fetch falha', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await isWorkerReady();
      
      expect(result).toBe(false);
    });
  });

  describe('supportsInline', () => {
    it('deve retornar true para desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });

      const result = supportsInline();
      expect(result).toBe(true);
    });

    it('deve retornar false para iPhone', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });

    it('deve retornar false para Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });

    it('deve retornar false para iPad', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = supportsInline();
      expect(result).toBe(false);
    });
  });

  describe('isPdfAccessible', () => {
    it('deve retornar true quando PDF está acessível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isPdfAccessible('essay123', 'token456');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/essays/essay123/file?t=token456',
        {
          method: 'HEAD',
          headers: { Authorization: 'Bearer token456' },
          cache: 'no-cache',
        }
      );
    });

    it('deve retornar false quando PDF não está acessível', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await isPdfAccessible('essay123', 'token456');
      
      expect(result).toBe(false);
    });

    it('deve funcionar sem token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await isPdfAccessible('essay123');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/essays/essay123/file',
        {
          method: 'HEAD',
          headers: {},
          cache: 'no-cache',
        }
      );
    });
  });

  describe('determinePdfStrategy', () => {
    beforeEach(() => {
      // Reset user agent para desktop
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });
    });

    it('deve retornar inline quando todas as condições são atendidas', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // worker check
        .mockResolvedValueOnce({ ok: true, status: 200 }); // accessibility check

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('inline');
    });

    it('deve retornar fallback quando worker não está pronto', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando não suporta inline', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      });

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando PDF não está acessível', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // worker check
        .mockResolvedValueOnce({ ok: false, status: 404 }); // accessibility check

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });

    it('deve retornar fallback quando ocorre erro', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await determinePdfStrategy('essay123', 'token456');
      
      expect(result).toBe('fallback');
    });
  });

  describe('handlePdfError', () => {
    it('deve retornar mensagem para erro 404', () => {
      const error = { response: { status: 404 } };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Arquivo não encontrado');
    });

    it('deve retornar mensagem para erro 5xx', () => {
      const error = { response: { status: 500 } };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Falha ao carregar documento. Tente novamente.');
    });

    it('deve retornar mensagem para ERR_FAILED', () => {
      const error = { message: 'ERR_FAILED' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Falha ao carregar documento. Tente novamente.');
    });

    it('deve retornar mensagem para WorkerMessageHandler', () => {
      const error = { message: 'WorkerMessageHandler error' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Erro no processamento do PDF - tente recarregar a página');
    });

    it('deve retornar mensagem genérica para outros erros', () => {
      const error = { message: 'Unknown error' };
      const result = handlePdfError(error, 'essay123');
      
      expect(result).toBe('Erro ao carregar PDF');
    });
  });
});



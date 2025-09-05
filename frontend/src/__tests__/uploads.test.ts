/**
 * Testes para o sistema de upload de redações
 * 
 * Cobre:
 * - Validação de arquivos
 * - Validação de URLs
 * - Upload com progresso
 * - Cancelamento de upload
 * - Tratamento de erros
 */

import { 
  uploadEssay, 
  validateFile, 
  validateFileUrl, 
  formatFileSize 
} from '@/services/uploads';
import { api } from '@/services/api';

// Mock do api
jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Sistema de Upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validação de Arquivo', () => {
    it('deve validar arquivo PDF válido', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve validar arquivo de imagem válido', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar arquivo com tipo não suportado', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de arquivo não suportado');
    });

    it('deve rejeitar arquivo muito grande', () => {
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'test.pdf', { 
        type: 'application/pdf' 
      });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Arquivo muito grande');
    });

    it('deve rejeitar arquivo nulo', () => {
      const result = validateFile(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nenhum arquivo selecionado');
    });
  });

  describe('Validação de URL', () => {
    it('deve validar URL válida', () => {
      const result = validateFileUrl('https://example.com/file.pdf');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar URL inválida', () => {
      const result = validateFileUrl('not-a-url');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL inválida');
    });

    it('deve rejeitar URL vazia', () => {
      const result = validateFileUrl('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL não informada');
    });

    it('deve rejeitar URL com espaços', () => {
      const result = validateFileUrl('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL não informada');
    });
  });

  describe('Formatação de Tamanho', () => {
    it('deve formatar bytes corretamente', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('deve formatar tamanhos decimais', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    });
  });

  describe('Upload de Redação', () => {
    it('deve fazer upload com sucesso', async () => {
      const mockResponse = {
        data: {
          id: 'essay-123',
          studentName: 'João Silva',
          topic: 'Redação sobre meio ambiente',
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));
      formData.append('studentId', 'student-123');
      formData.append('topic', 'Meio ambiente');

      const result = await uploadEssay(formData);

      expect(result.success).toBe(true);
      expect(result.essayId).toBe('essay-123');
      expect(result.studentName).toBe('João Silva');
      expect(result.topic).toBe('Redação sobre meio ambiente');
      expect(api.post).toHaveBeenCalledWith('/uploads/essay', formData, {
        headers: {},
        onUploadProgress: expect.any(Function),
        signal: undefined,
      });
    });

    it('deve chamar callback de progresso', async () => {
      const mockResponse = { data: { id: 'essay-123' } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const onProgress = jest.fn();
      await uploadEssay(formData, { onProgress });

      // Simula evento de progresso
      const progressEvent = { loaded: 50, total: 100 };
      const onUploadProgress = (api.post as jest.Mock).mock.calls[0][2].onUploadProgress;
      onUploadProgress(progressEvent);

      expect(onProgress).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50,
      });
    });

    it('deve cancelar upload quando AbortController é usado', async () => {
      const abortController = new AbortController();
      const mockError = new Error('Request cancelled');
      mockError.name = 'AbortError';

      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const onCancel = jest.fn();
      const result = await uploadEssay(formData, { 
        signal: abortController.signal,
        onCancel 
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload cancelado pelo usuário');
      expect(onCancel).toHaveBeenCalled();
    });

    it('deve tratar erro de upload', async () => {
      const mockError = {
        response: {
          data: { message: 'Arquivo muito grande' },
          status: 400,
        },
      };

      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const result = await uploadEssay(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Arquivo muito grande');
    });

    it('deve tratar erro sem response', async () => {
      const mockError = new Error('Network error');
      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const result = await uploadEssay(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});


 * Testes para o sistema de upload de redações
 * 
 * Cobre:
 * - Validação de arquivos
 * - Validação de URLs
 * - Upload com progresso
 * - Cancelamento de upload
 * - Tratamento de erros
 */

import { 
  uploadEssay, 
  validateFile, 
  validateFileUrl, 
  formatFileSize 
} from '@/services/uploads';
import { api } from '@/services/api';

// Mock do api
jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Sistema de Upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validação de Arquivo', () => {
    it('deve validar arquivo PDF válido', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve validar arquivo de imagem válido', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar arquivo com tipo não suportado', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de arquivo não suportado');
    });

    it('deve rejeitar arquivo muito grande', () => {
      const file = new File(['x'.repeat(11 * 1024 * 1024)], 'test.pdf', { 
        type: 'application/pdf' 
      });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Arquivo muito grande');
    });

    it('deve rejeitar arquivo nulo', () => {
      const result = validateFile(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nenhum arquivo selecionado');
    });
  });

  describe('Validação de URL', () => {
    it('deve validar URL válida', () => {
      const result = validateFileUrl('https://example.com/file.pdf');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar URL inválida', () => {
      const result = validateFileUrl('not-a-url');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL inválida');
    });

    it('deve rejeitar URL vazia', () => {
      const result = validateFileUrl('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL não informada');
    });

    it('deve rejeitar URL com espaços', () => {
      const result = validateFileUrl('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL não informada');
    });
  });

  describe('Formatação de Tamanho', () => {
    it('deve formatar bytes corretamente', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('deve formatar tamanhos decimais', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    });
  });

  describe('Upload de Redação', () => {
    it('deve fazer upload com sucesso', async () => {
      const mockResponse = {
        data: {
          id: 'essay-123',
          studentName: 'João Silva',
          topic: 'Redação sobre meio ambiente',
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));
      formData.append('studentId', 'student-123');
      formData.append('topic', 'Meio ambiente');

      const result = await uploadEssay(formData);

      expect(result.success).toBe(true);
      expect(result.essayId).toBe('essay-123');
      expect(result.studentName).toBe('João Silva');
      expect(result.topic).toBe('Redação sobre meio ambiente');
      expect(api.post).toHaveBeenCalledWith('/uploads/essay', formData, {
        headers: {},
        onUploadProgress: expect.any(Function),
        signal: undefined,
      });
    });

    it('deve chamar callback de progresso', async () => {
      const mockResponse = { data: { id: 'essay-123' } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const onProgress = jest.fn();
      await uploadEssay(formData, { onProgress });

      // Simula evento de progresso
      const progressEvent = { loaded: 50, total: 100 };
      const onUploadProgress = (api.post as jest.Mock).mock.calls[0][2].onUploadProgress;
      onUploadProgress(progressEvent);

      expect(onProgress).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50,
      });
    });

    it('deve cancelar upload quando AbortController é usado', async () => {
      const abortController = new AbortController();
      const mockError = new Error('Request cancelled');
      mockError.name = 'AbortError';

      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const onCancel = jest.fn();
      const result = await uploadEssay(formData, { 
        signal: abortController.signal,
        onCancel 
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload cancelado pelo usuário');
      expect(onCancel).toHaveBeenCalled();
    });

    it('deve tratar erro de upload', async () => {
      const mockError = {
        response: {
          data: { message: 'Arquivo muito grande' },
          status: 400,
        },
      };

      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const result = await uploadEssay(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Arquivo muito grande');
    });

    it('deve tratar erro sem response', async () => {
      const mockError = new Error('Network error');
      (api.post as jest.Mock).mockRejectedValue(mockError);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.pdf'));

      const result = await uploadEssay(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});



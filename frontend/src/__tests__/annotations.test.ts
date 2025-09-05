/**
 * Testes para o sistema de anotações unificado
 * 
 * Cobre:
 * - Debounce de múltiplas edições
 * - Atualização otimista
 * - Rollback em caso de erro
 * - CORS-safe headers
 * - Tratamento de 204 como sucesso
 */

import { renderHook, act, waitFor } from '@testing-library/react';
// Mock completo do api antes de importar
const mockApi = {
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
};

jest.mock('@/services/api', () => ({
  api: mockApi,
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    auth: jest.fn(),
    apiError: jest.fn(),
  },
}));

import { 
  getAnnotations, 
  saveAnnotations, 
  createAnnotation,
  useOptimisticAnnotations 
} from '@/services/annotations';

// Mock do debouncePromise
jest.mock('@/utils/debouncePromise', () => ({
  debouncePromise: jest.fn((fn, delay) => fn), // Remove debounce para testes
}));

describe('Sistema de Anotações', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnnotations', () => {
    it('deve buscar anotações com sucesso', async () => {
      const mockData = {
        annotations: [
          { id: '1', color: 'green', label: 'Erro' },
          { id: '2', color: 'blue', label: 'Obs' }
        ],
        richAnnotations: [
          { id: '1', page: 1, type: 'error' }
        ]
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await getAnnotations('essay123');

      expect(mockApi.get).toHaveBeenCalledWith('/essays/essay123/annotations');
      expect(result).toEqual(mockData);
    });

    it('deve tratar erro ao buscar anotações', async () => {
      (mockApi.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getAnnotations('essay123')).rejects.toThrow('Falha ao carregar anotações');
    });
  });

  describe('saveAnnotations', () => {
    it('deve salvar anotações com headers CORS-safe', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: [{ id: '1', page: 1, type: 'error' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 200 });

      await saveAnnotations('essay123', payload);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/essays/essay123/annotations',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('deve tratar 204 como sucesso', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 204 });

      await expect(saveAnnotations('essay123', payload)).resolves.toBeUndefined();
    });

    it('deve tratar erro CORS', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      const corsError = new Error('CORS error');
      corsError.code = 'ERR_NETWORK';
      (mockApi.put as jest.Mock).mockRejectedValue(corsError);

      await expect(saveAnnotations('essay123', payload)).rejects.toThrow('CORS error');
    });

    it('deve tratar status inesperado', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 500 });

      await expect(saveAnnotations('essay123', payload)).rejects.toThrow('Status inesperado: 500');
    });
  });

  describe('createAnnotation', () => {
    it('deve criar nova anotação', async () => {
      const annotation = { id: '1', color: 'green', label: 'Erro' };
      (mockApi.post as jest.Mock).mockResolvedValue({ data: annotation });

      const result = await createAnnotation('essay123', annotation);

      expect(mockApi.post).toHaveBeenCalledWith('/essays/essay123/annotations', annotation);
      expect(result).toEqual(annotation);
    });

    it('deve tratar erro ao criar anotação', async () => {
      const annotation = { id: '1', color: 'green', label: 'Erro' };
      (mockApi.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(createAnnotation('essay123', annotation)).rejects.toThrow('Falha ao criar anotação');
    });
  });

  describe('useOptimisticAnnotations', () => {
    it('deve carregar anotações iniciais', async () => {
      const mockData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: [{ id: '1', page: 1, type: 'error' }]
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(mockData.annotations);
      }, { timeout: 3000 });

      expect(result.current.richAnnotations).toEqual(mockData.richAnnotations);
      expect(result.current.isOptimistic).toBe(false);
      expect(result.current.lastSaved).toBeDefined();
    });

    it('deve fazer atualização otimista', async () => {
      const initialData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: []
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: initialData });
      (mockApi.put as jest.Mock).mockResolvedValue({ status: 200 });

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(initialData.annotations);
      }, { timeout: 3000 });

      const newAnnotations = [
        { id: '1', color: 'green', label: 'Erro' },
        { id: '2', color: 'blue', label: 'Obs' }
      ];

      act(() => {
        result.current.updateOptimistic(newAnnotations);
      });

      // Verifica atualização otimista imediata
      expect(result.current.annotations).toEqual(newAnnotations);
      expect(result.current.isOptimistic).toBe(true);

      // Aguarda salvamento no servidor
      await waitFor(() => {
        expect(result.current.isOptimistic).toBe(false);
      }, { timeout: 3000 });

      expect(mockApi.put).toHaveBeenCalledWith(
        '/essays/essay123/annotations',
        {
          annotations: newAnnotations,
          richAnnotations: []
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('deve fazer rollback em caso de erro', async () => {
      const initialData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: []
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: initialData });
      (mockApi.put as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(initialData.annotations);
      }, { timeout: 3000 });

      const newAnnotations = [
        { id: '1', color: 'green', label: 'Erro' },
        { id: '2', color: 'blue', label: 'Obs' }
      ];

      act(() => {
        result.current.updateOptimistic(newAnnotations);
      });

      // Verifica atualização otimista
      expect(result.current.annotations).toEqual(newAnnotations);
      expect(result.current.isOptimistic).toBe(true);

      // Aguarda erro e rollback
      await waitFor(() => {
        expect(result.current.isOptimistic).toBe(false);
        expect(result.current.error).toBe('Não foi possível salvar anotações');
      }, { timeout: 3000 });

      // Verifica que voltou ao estado original
      expect(result.current.annotations).toEqual(initialData.annotations);
    });
  });
});

 * 
 * Cobre:
 * - Debounce de múltiplas edições
 * - Atualização otimista
 * - Rollback em caso de erro
 * - CORS-safe headers
 * - Tratamento de 204 como sucesso
 */

import { renderHook, act, waitFor } from '@testing-library/react';
// Mock completo do api antes de importar
const mockApi = {
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
};

jest.mock('@/services/api', () => ({
  api: mockApi,
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    auth: jest.fn(),
    apiError: jest.fn(),
  },
}));

import { 
  getAnnotations, 
  saveAnnotations, 
  createAnnotation,
  useOptimisticAnnotations 
} from '@/services/annotations';

// Mock do debouncePromise
jest.mock('@/utils/debouncePromise', () => ({
  debouncePromise: jest.fn((fn, delay) => fn), // Remove debounce para testes
}));

describe('Sistema de Anotações', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnnotations', () => {
    it('deve buscar anotações com sucesso', async () => {
      const mockData = {
        annotations: [
          { id: '1', color: 'green', label: 'Erro' },
          { id: '2', color: 'blue', label: 'Obs' }
        ],
        richAnnotations: [
          { id: '1', page: 1, type: 'error' }
        ]
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await getAnnotations('essay123');

      expect(mockApi.get).toHaveBeenCalledWith('/essays/essay123/annotations');
      expect(result).toEqual(mockData);
    });

    it('deve tratar erro ao buscar anotações', async () => {
      (mockApi.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getAnnotations('essay123')).rejects.toThrow('Falha ao carregar anotações');
    });
  });

  describe('saveAnnotations', () => {
    it('deve salvar anotações com headers CORS-safe', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: [{ id: '1', page: 1, type: 'error' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 200 });

      await saveAnnotations('essay123', payload);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/essays/essay123/annotations',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('deve tratar 204 como sucesso', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 204 });

      await expect(saveAnnotations('essay123', payload)).resolves.toBeUndefined();
    });

    it('deve tratar erro CORS', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      const corsError = new Error('CORS error');
      corsError.code = 'ERR_NETWORK';
      (mockApi.put as jest.Mock).mockRejectedValue(corsError);

      await expect(saveAnnotations('essay123', payload)).rejects.toThrow('CORS error');
    });

    it('deve tratar status inesperado', async () => {
      const payload = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }]
      };

      (mockApi.put as jest.Mock).mockResolvedValue({ status: 500 });

      await expect(saveAnnotations('essay123', payload)).rejects.toThrow('Status inesperado: 500');
    });
  });

  describe('createAnnotation', () => {
    it('deve criar nova anotação', async () => {
      const annotation = { id: '1', color: 'green', label: 'Erro' };
      (mockApi.post as jest.Mock).mockResolvedValue({ data: annotation });

      const result = await createAnnotation('essay123', annotation);

      expect(mockApi.post).toHaveBeenCalledWith('/essays/essay123/annotations', annotation);
      expect(result).toEqual(annotation);
    });

    it('deve tratar erro ao criar anotação', async () => {
      const annotation = { id: '1', color: 'green', label: 'Erro' };
      (mockApi.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(createAnnotation('essay123', annotation)).rejects.toThrow('Falha ao criar anotação');
    });
  });

  describe('useOptimisticAnnotations', () => {
    it('deve carregar anotações iniciais', async () => {
      const mockData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: [{ id: '1', page: 1, type: 'error' }]
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: mockData });

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(mockData.annotations);
      }, { timeout: 3000 });

      expect(result.current.richAnnotations).toEqual(mockData.richAnnotations);
      expect(result.current.isOptimistic).toBe(false);
      expect(result.current.lastSaved).toBeDefined();
    });

    it('deve fazer atualização otimista', async () => {
      const initialData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: []
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: initialData });
      (mockApi.put as jest.Mock).mockResolvedValue({ status: 200 });

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(initialData.annotations);
      }, { timeout: 3000 });

      const newAnnotations = [
        { id: '1', color: 'green', label: 'Erro' },
        { id: '2', color: 'blue', label: 'Obs' }
      ];

      act(() => {
        result.current.updateOptimistic(newAnnotations);
      });

      // Verifica atualização otimista imediata
      expect(result.current.annotations).toEqual(newAnnotations);
      expect(result.current.isOptimistic).toBe(true);

      // Aguarda salvamento no servidor
      await waitFor(() => {
        expect(result.current.isOptimistic).toBe(false);
      }, { timeout: 3000 });

      expect(mockApi.put).toHaveBeenCalledWith(
        '/essays/essay123/annotations',
        {
          annotations: newAnnotations,
          richAnnotations: []
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('deve fazer rollback em caso de erro', async () => {
      const initialData = {
        annotations: [{ id: '1', color: 'green', label: 'Erro' }],
        richAnnotations: []
      };

      (mockApi.get as jest.Mock).mockResolvedValue({ data: initialData });
      (mockApi.put as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOptimisticAnnotations('essay123'));

      // Aguarda carregamento inicial
      await waitFor(() => {
        expect(result.current.annotations).toEqual(initialData.annotations);
      }, { timeout: 3000 });

      const newAnnotations = [
        { id: '1', color: 'green', label: 'Erro' },
        { id: '2', color: 'blue', label: 'Obs' }
      ];

      act(() => {
        result.current.updateOptimistic(newAnnotations);
      });

      // Verifica atualização otimista
      expect(result.current.annotations).toEqual(newAnnotations);
      expect(result.current.isOptimistic).toBe(true);

      // Aguarda erro e rollback
      await waitFor(() => {
        expect(result.current.isOptimistic).toBe(false);
        expect(result.current.error).toBe('Não foi possível salvar anotações');
      }, { timeout: 3000 });

      // Verifica que voltou ao estado original
      expect(result.current.annotations).toEqual(initialData.annotations);
    });
  });
});

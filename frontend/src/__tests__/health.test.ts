/**
 * Testes para o sistema de health-check do backend
 * 
 * Cobre:
 * - checkApiHealth com sucesso e falha
 * - Cache de resultados
 * - Hook useBackendHealth
 * - Utilitários de degradação
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  checkApiHealth, 
  useBackendHealth,
  shouldBlockAction,
  clearHealthCache 
} from '@/services/health';
import { api } from '@/services/api';

// Mock do api
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sistema de Health-Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearHealthCache();
  });

  describe('checkApiHealth', () => {
    it('deve retornar true quando backend está saudável', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await checkApiHealth();

      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/health', {
        timeout: 2500,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
    });

    it('deve retornar false quando backend retorna erro 500', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 500 });

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve retornar false quando há timeout', async () => {
      const timeoutError = new Error('timeout of 2500ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      (api.get as jest.Mock).mockRejectedValue(timeoutError);

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve retornar false quando há erro de rede', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      (api.get as jest.Mock).mockRejectedValue(networkError);

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve usar cache quando não forçado', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Primeira chamada
      const result1 = await checkApiHealth();
      expect(result1).toBe(true);
      expect(api.get).toHaveBeenCalledTimes(1);

      // Segunda chamada (deve usar cache)
      const result2 = await checkApiHealth();
      expect(result2).toBe(true);
      expect(api.get).toHaveBeenCalledTimes(1); // Não deve chamar novamente
    });

    it('deve ignorar cache quando forçado', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Primeira chamada
      await checkApiHealth();
      expect(api.get).toHaveBeenCalledTimes(1);

      // Segunda chamada forçada
      await checkApiHealth(true);
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('useBackendHealth', () => {
    it('deve retornar estado inicial saudável', () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      const { result } = renderHook(() => useBackendHealth());

      expect(result.current.isHealthy).toBe(true);
      expect(result.current.isChecking).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('deve detectar quando backend fica indisponível', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useBackendHealth());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      }, { timeout: 10000 });

      expect(result.current.retryCount).toBeGreaterThan(0);
    });

    it('deve permitir retry manual', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useBackendHealth());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      }, { timeout: 10000 });

      // Mock sucesso para retry
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isHealthy).toBe(true);
    });
  });

  describe('shouldBlockAction', () => {
    it('deve bloquear ação quando backend está indisponível', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      // Aguardar backend ficar indisponível
      await checkApiHealth();

      const shouldBlock = shouldBlockAction('test_action');
      expect(shouldBlock).toBe(true);
    });

    it('deve permitir ação quando backend está saudável', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Aguardar backend ficar saudável
      await checkApiHealth();

      const shouldBlock = shouldBlockAction('test_action');
      expect(shouldBlock).toBe(false);
    });
  });

  describe('clearHealthCache', () => {
    it('deve limpar cache corretamente', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      // Fazer backend ficar indisponível
      await checkApiHealth();

      // Limpar cache
      clearHealthCache();

      // Mock sucesso
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Verificar que agora retorna saudável
      const result = await checkApiHealth();
      expect(result).toBe(true);
    });
  });
});

 * 
 * Cobre:
 * - checkApiHealth com sucesso e falha
 * - Cache de resultados
 * - Hook useBackendHealth
 * - Utilitários de degradação
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  checkApiHealth, 
  useBackendHealth,
  shouldBlockAction,
  clearHealthCache 
} from '@/services/health';
import { api } from '@/services/api';

// Mock do api
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sistema de Health-Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearHealthCache();
  });

  describe('checkApiHealth', () => {
    it('deve retornar true quando backend está saudável', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await checkApiHealth();

      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/health', {
        timeout: 2500,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
    });

    it('deve retornar false quando backend retorna erro 500', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 500 });

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve retornar false quando há timeout', async () => {
      const timeoutError = new Error('timeout of 2500ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      (api.get as jest.Mock).mockRejectedValue(timeoutError);

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve retornar false quando há erro de rede', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      (api.get as jest.Mock).mockRejectedValue(networkError);

      const result = await checkApiHealth();

      expect(result).toBe(false);
    });

    it('deve usar cache quando não forçado', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Primeira chamada
      const result1 = await checkApiHealth();
      expect(result1).toBe(true);
      expect(api.get).toHaveBeenCalledTimes(1);

      // Segunda chamada (deve usar cache)
      const result2 = await checkApiHealth();
      expect(result2).toBe(true);
      expect(api.get).toHaveBeenCalledTimes(1); // Não deve chamar novamente
    });

    it('deve ignorar cache quando forçado', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Primeira chamada
      await checkApiHealth();
      expect(api.get).toHaveBeenCalledTimes(1);

      // Segunda chamada forçada
      await checkApiHealth(true);
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('useBackendHealth', () => {
    it('deve retornar estado inicial saudável', () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      const { result } = renderHook(() => useBackendHealth());

      expect(result.current.isHealthy).toBe(true);
      expect(result.current.isChecking).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('deve detectar quando backend fica indisponível', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useBackendHealth());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      }, { timeout: 10000 });

      expect(result.current.retryCount).toBeGreaterThan(0);
    });

    it('deve permitir retry manual', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useBackendHealth());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      }, { timeout: 10000 });

      // Mock sucesso para retry
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.isHealthy).toBe(true);
    });
  });

  describe('shouldBlockAction', () => {
    it('deve bloquear ação quando backend está indisponível', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      // Aguardar backend ficar indisponível
      await checkApiHealth();

      const shouldBlock = shouldBlockAction('test_action');
      expect(shouldBlock).toBe(true);
    });

    it('deve permitir ação quando backend está saudável', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Aguardar backend ficar saudável
      await checkApiHealth();

      const shouldBlock = shouldBlockAction('test_action');
      expect(shouldBlock).toBe(false);
    });
  });

  describe('clearHealthCache', () => {
    it('deve limpar cache corretamente', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      // Fazer backend ficar indisponível
      await checkApiHealth();

      // Limpar cache
      clearHealthCache();

      // Mock sucesso
      (api.get as jest.Mock).mockResolvedValue({ status: 200 });

      // Verificar que agora retorna saudável
      const result = await checkApiHealth();
      expect(result).toBe(true);
    });
  });
});

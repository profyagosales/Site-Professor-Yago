/**
 * Testes para o hook useOfflineMode
 * 
 * Cobre:
 * - Detecção de modo offline
 * - Bloqueio de ações específicas
 * - Props de desabilitação
 * - Integração com useNetworkStatus e useBackendHealth
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBackendHealth } from '@/services/health';

// Mock dos hooks
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/services/health');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseBackendHealth = useBackendHealth as jest.MockedFunction<typeof useBackendHealth>;

describe('useOfflineMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modo online e backend saudável', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = false', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(false);
    });

    it('deve permitir todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(false);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(false);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(false);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(false);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(false);
    });

    it('deve retornar props não desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(false);
      expect(props.title).toBeUndefined();
    });
  });

  describe('Modo offline (sem internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = true', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(true);
    });

    it('deve bloquear todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(true);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(true);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve retornar props desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(true);
      expect(props.title).toBe('Serviço temporariamente indisponível');
    });

    it('deve prevenir clique quando desabilitado', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any;

      props.onClick?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Backend indisponível (com internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 2,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = true', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(true);
    });

    it('deve bloquear todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(true);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(true);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve retornar props desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(true);
      expect(props.title).toBe('Serviço temporariamente indisponível');
    });
  });

  describe('Transições de estado', () => {
    it('deve reagir a mudanças de conectividade', () => {
      const { result, rerender } = renderHook(() => useOfflineMode());

      // Estado inicial: online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(false);

      // Mudança para offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(true);
    });

    it('deve reagir a mudanças de saúde do backend', () => {
      const { result, rerender } = renderHook(() => useOfflineMode());

      // Estado inicial: saudável
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(false);

      // Backend fica indisponível
      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('Ações específicas', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });
    });

    it('deve tratar ação genérica any_network_action', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve tratar ações específicas igualmente', () => {
      const { result } = renderHook(() => useOfflineMode());

      const actions = [
        'save_essay',
        'save_and_generate_pdf', 
        'open_pdf',
        'submit_grade'
      ] as const;

      actions.forEach(action => {
        expect(result.current.shouldBlockAction(action)).toBe(true);
      });
    });
  });

  describe('Props de desabilitação', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });
    });

    it('deve retornar props consistentes para diferentes ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      const actions = [
        'save_essay',
        'save_and_generate_pdf', 
        'open_pdf',
        'submit_grade'
      ] as const;

      actions.forEach(action => {
        const props = result.current.getDisabledProps(action);
        expect(props.disabled).toBe(true);
        expect(props.title).toBe('Serviço temporariamente indisponível');
        expect(typeof props.onClick).toBe('function');
      });
    });

    it('deve ter onClick que previne eventos', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any;

      props.onClick?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});


 * Testes para o hook useOfflineMode
 * 
 * Cobre:
 * - Detecção de modo offline
 * - Bloqueio de ações específicas
 * - Props de desabilitação
 * - Integração com useNetworkStatus e useBackendHealth
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBackendHealth } from '@/services/health';

// Mock dos hooks
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/services/health');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseBackendHealth = useBackendHealth as jest.MockedFunction<typeof useBackendHealth>;

describe('useOfflineMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modo online e backend saudável', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = false', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(false);
    });

    it('deve permitir todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(false);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(false);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(false);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(false);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(false);
    });

    it('deve retornar props não desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(false);
      expect(props.title).toBeUndefined();
    });
  });

  describe('Modo offline (sem internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = true', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(true);
    });

    it('deve bloquear todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(true);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(true);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve retornar props desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(true);
      expect(props.title).toBe('Serviço temporariamente indisponível');
    });

    it('deve prevenir clique quando desabilitado', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any;

      props.onClick?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Backend indisponível (com internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 2,
        retry: jest.fn(),
      });
    });

    it('deve retornar isOffline = true', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.isOffline).toBe(true);
    });

    it('deve bloquear todas as ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('save_essay')).toBe(true);
      expect(result.current.shouldBlockAction('save_and_generate_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('open_pdf')).toBe(true);
      expect(result.current.shouldBlockAction('submit_grade')).toBe(true);
      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve retornar props desabilitadas', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');

      expect(props.disabled).toBe(true);
      expect(props.title).toBe('Serviço temporariamente indisponível');
    });
  });

  describe('Transições de estado', () => {
    it('deve reagir a mudanças de conectividade', () => {
      const { result, rerender } = renderHook(() => useOfflineMode());

      // Estado inicial: online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(false);

      // Mudança para offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(true);
    });

    it('deve reagir a mudanças de saúde do backend', () => {
      const { result, rerender } = renderHook(() => useOfflineMode());

      // Estado inicial: saudável
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(false);

      // Backend fica indisponível
      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });

      rerender();

      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('Ações específicas', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });
    });

    it('deve tratar ação genérica any_network_action', () => {
      const { result } = renderHook(() => useOfflineMode());

      expect(result.current.shouldBlockAction('any_network_action')).toBe(true);
    });

    it('deve tratar ações específicas igualmente', () => {
      const { result } = renderHook(() => useOfflineMode());

      const actions = [
        'save_essay',
        'save_and_generate_pdf', 
        'open_pdf',
        'submit_grade'
      ] as const;

      actions.forEach(action => {
        expect(result.current.shouldBlockAction(action)).toBe(true);
      });
    });
  });

  describe('Props de desabilitação', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: jest.fn(),
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: jest.fn(),
      });
    });

    it('deve retornar props consistentes para diferentes ações', () => {
      const { result } = renderHook(() => useOfflineMode());

      const actions = [
        'save_essay',
        'save_and_generate_pdf', 
        'open_pdf',
        'submit_grade'
      ] as const;

      actions.forEach(action => {
        const props = result.current.getDisabledProps(action);
        expect(props.disabled).toBe(true);
        expect(props.title).toBe('Serviço temporariamente indisponível');
        expect(typeof props.onClick).toBe('function');
      });
    });

    it('deve ter onClick que previne eventos', () => {
      const { result } = renderHook(() => useOfflineMode());

      const props = result.current.getDisabledProps('save_essay');
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any;

      props.onClick?.(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});



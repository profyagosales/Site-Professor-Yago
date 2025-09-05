/**
 * Testes para o hook usePreferences
 *
 * Cobre:
 * - Armazenamento no localStorage
 * - Carregamento do localStorage
 * - Validação de valores
 * - Transformação de valores
 * - Sincronização entre abas
 */

import { renderHook, act } from '@testing-library/react';
import { usePreferences, useListPreferences } from '@/hooks/usePreferences';

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do window.addEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

describe('usePreferences Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve ter valores padrão corretos', () => {
    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual({
      pageSize: 10,
      theme: 'light',
      language: 'pt-BR',
    });
  });

  it('deve carregar preferências do localStorage', () => {
    const storedPreferences = {
      pageSize: 20,
      theme: 'dark',
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences));

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual({
      pageSize: 20,
      theme: 'dark',
      language: 'pt-BR', // Valor padrão
    });
  });

  it('deve definir uma preferência', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setPreference('pageSize', 20);
    });

    expect(result.current.preferences.pageSize).toBe(20);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'app_preferences',
      JSON.stringify({
        pageSize: 20,
        theme: 'light',
        language: 'pt-BR',
      })
    );
  });

  it('deve definir múltiplas preferências', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setPreferences({
        pageSize: 20,
        theme: 'dark',
      });
    });

    expect(result.current.preferences).toEqual({
      pageSize: 20,
      theme: 'dark',
      language: 'pt-BR',
    });
  });

  it('deve remover uma preferência', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setPreference('pageSize', 20);
    });

    act(() => {
      result.current.removePreference('pageSize');
    });

    expect(result.current.preferences.pageSize).toBeUndefined();
  });

  it('deve limpar todas as preferências', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setPreference('pageSize', 20);
    });

    act(() => {
      result.current.clearPreferences();
    });

    expect(result.current.preferences).toEqual({
      pageSize: 10,
      theme: 'light',
      language: 'pt-BR',
    });
  });

  it('deve validar valores', () => {
    const validate = (key: string, value: any) => {
      if (key === 'pageSize') {
        return typeof value === 'number' && value > 0 && value <= 100;
      }
      return true;
    };

    const { result } = renderHook(() => usePreferences({ validate }));

    act(() => {
      result.current.setPreference('pageSize', 150);
    });

    // Não deve definir valor inválido
    expect(result.current.preferences.pageSize).toBe(10);

    act(() => {
      result.current.setPreference('pageSize', 20);
    });

    // Deve definir valor válido
    expect(result.current.preferences.pageSize).toBe(20);
  });

  it('deve transformar valores ao carregar', () => {
    const transform = (key: string, value: any) => {
      if (key === 'pageSize') {
        return Number(value);
      }
      return value;
    };

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ pageSize: '20' })
    );

    const { result } = renderHook(() => usePreferences({ transform }));

    expect(typeof result.current.preferences.pageSize).toBe('number');
    expect(result.current.preferences.pageSize).toBe(20);
  });

  it('deve escutar mudanças no localStorage', () => {
    const { result } = renderHook(() => usePreferences());

    // Simula mudança no localStorage de outra aba
    const storageEvent = new StorageEvent('storage', {
      key: 'app_preferences',
      newValue: JSON.stringify({ pageSize: 30 }),
    });

    act(() => {
      window.dispatchEvent(storageEvent);
    });

    expect(result.current.preferences.pageSize).toBe(30);
  });

  it('deve limpar listeners ao desmontar', () => {
    const { unmount } = renderHook(() => usePreferences());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    );
  });
});

describe('useListPreferences Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve ter valores padrão corretos', () => {
    const { result } = renderHook(() => useListPreferences());

    expect(result.current.pageSize).toBe(10);
    expect(typeof result.current.setPageSize).toBe('function');
  });

  it('deve carregar pageSize do localStorage', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ pageSize: 20 }));

    const { result } = renderHook(() => useListPreferences());

    expect(result.current.pageSize).toBe(20);
  });

  it('deve definir pageSize', () => {
    const { result } = renderHook(() => useListPreferences());

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.pageSize).toBe(20);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'list_preferences',
      JSON.stringify({ pageSize: 20 })
    );
  });

  it('deve validar pageSize', () => {
    const { result } = renderHook(() => useListPreferences());

    act(() => {
      result.current.setPageSize(150);
    });

    // Não deve definir valor inválido
    expect(result.current.pageSize).toBe(10);

    act(() => {
      result.current.setPageSize(0);
    });

    // Não deve definir valor inválido
    expect(result.current.pageSize).toBe(10);

    act(() => {
      result.current.setPageSize(20);
    });

    // Deve definir valor válido
    expect(result.current.pageSize).toBe(20);
  });
});

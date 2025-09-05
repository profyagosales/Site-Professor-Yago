/**
 * Testes para o hook useQueryParams
 *
 * Cobre:
 * - Leitura de parâmetros da URL
 * - Escrita de parâmetros na URL
 * - Validação de valores
 * - Transformação de valores
 * - Preservação de parâmetros
 */

import { renderHook, act } from '@testing-library/react';
import {
  useQueryParams,
  useDashboardQueryParams,
} from '@/hooks/useQueryParams';
import { useLocation, useNavigate } from 'react-router-dom';

// Mock do react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

// Mock do window.history
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();

Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: mockReplaceState,
  },
});

describe('useQueryParams Hook', () => {
  const mockNavigate = jest.fn();
  const mockLocation = {
    pathname: '/test',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocation as jest.Mock).mockReturnValue(mockLocation);
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it('deve ter estado inicial correto', () => {
    const { result } = renderHook(() => useQueryParams());

    expect(result.current.params).toEqual({});
    expect(typeof result.current.setParam).toBe('function');
    expect(typeof result.current.setParams).toBe('function');
    expect(typeof result.current.removeParam).toBe('function');
    expect(typeof result.current.clearParams).toBe('function');
    expect(typeof result.current.getParam).toBe('function');
    expect(typeof result.current.hasParam).toBe('function');
  });

  it('deve ler parâmetros da URL', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?page=2&size=20&q=test',
    });

    const { result } = renderHook(() => useQueryParams());

    expect(result.current.params).toEqual({
      page: '2',
      size: '20',
      q: 'test',
    });
  });

  it('deve definir um parâmetro', () => {
    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setParam('page', '3');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/test?page=3', {
      replace: true,
    });
  });

  it('deve definir múltiplos parâmetros', () => {
    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.setParams({ page: '2', size: '10' });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/test?page=2&size=10', {
      replace: true,
    });
  });

  it('deve remover um parâmetro', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?page=2&size=20',
    });

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.removeParam('page');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/test?size=20', {
      replace: true,
    });
  });

  it('deve limpar todos os parâmetros', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?page=2&size=20',
    });

    const { result } = renderHook(() => useQueryParams());

    act(() => {
      result.current.clearParams();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/test', { replace: true });
  });

  it('deve validar valores', () => {
    const validate = (key: string, value: string) => {
      if (key === 'page') {
        return !isNaN(Number(value)) && Number(value) > 0;
      }
      return true;
    };

    const { result } = renderHook(() => useQueryParams({}, { validate }));

    act(() => {
      result.current.setParam('page', 'invalid');
    });

    // Não deve navegar com valor inválido
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deve transformar valores', () => {
    const transform = (key: string, value: string) => {
      if (key === 'page') {
        return Number(value);
      }
      return value;
    };

    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?page=2',
    });

    const { result } = renderHook(() => useQueryParams({}, { transform }));

    expect(result.current.params).toEqual({ page: 2 });
  });

  it('deve preservar parâmetros especificados', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?preserved=value&other=test',
    });

    const { result } = renderHook(() =>
      useQueryParams({}, { preserve: ['preserved'] })
    );

    act(() => {
      result.current.setParam('new', 'value');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/test?preserved=value&new=value',
      { replace: true }
    );
  });
});

describe('useDashboardQueryParams Hook', () => {
  const mockNavigate = jest.fn();
  const mockLocation = {
    pathname: '/dashboard',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocation as jest.Mock).mockReturnValue(mockLocation);
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it('deve ter valores padrão corretos', () => {
    const { result } = renderHook(() => useDashboardQueryParams());

    expect(result.current.status).toBe('pendentes');
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.q).toBe('');
    expect(result.current.classId).toBe('');
    expect(result.current.bimester).toBe('');
    expect(result.current.type).toBe('');
  });

  it('deve ler parâmetros da URL', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search:
        '?status=corrigidas&page=2&pageSize=20&q=joao&classId=123&bimester=1&type=ENEM',
    });

    const { result } = renderHook(() => useDashboardQueryParams());

    expect(result.current.status).toBe('corrigidas');
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.q).toBe('joao');
    expect(result.current.classId).toBe('123');
    expect(result.current.bimester).toBe('1');
    expect(result.current.type).toBe('ENEM');
  });

  it('deve validar valores corretamente', () => {
    const { result } = renderHook(() => useDashboardQueryParams());

    act(() => {
      result.current.setStatus('invalid');
    });

    // Não deve navegar com status inválido
    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      result.current.setPage(0);
    });

    // Não deve navegar com página inválida
    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      result.current.setPage(2);
    });

    // Deve navegar com página válida
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard?page=2', {
      replace: true,
    });
  });

  it('deve transformar valores numéricos', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      search: '?page=2&pageSize=20',
    });

    const { result } = renderHook(() => useDashboardQueryParams());

    expect(typeof result.current.page).toBe('number');
    expect(typeof result.current.pageSize).toBe('number');
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(20);
  });

  it('deve definir filtros em lote', () => {
    const { result } = renderHook(() => useDashboardQueryParams());

    act(() => {
      result.current.setFilters({
        q: 'joao',
        classId: '123',
        bimester: '1',
        type: 'ENEM',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard?q=joao&classId=123&bimester=1&type=ENEM',
      { replace: true }
    );
  });
});

/**
 * Testes para o hook useDashboardEssays
 *
 * Cobre:
 * - URL state e sincronização
 * - Persistência de preferências
 * - Carregamento de dados
 * - Filtros e paginação
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardEssays } from '@/hooks/useDashboardEssays';
import { useListPreferences } from '@/hooks/usePreferences';

// Mock dos hooks
jest.mock('@/hooks/usePreferences', () => ({
  useListPreferences: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/dashboard',
    search: '?status=pendentes&page=1&pageSize=10',
  }),
  useNavigate: () => jest.fn(),
}));

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

describe('useDashboardEssays Hook', () => {
  const mockLoadData = jest.fn();
  const mockSetPageSize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useListPreferences as jest.Mock).mockReturnValue({
      pageSize: 10,
      setPageSize: mockSetPageSize,
    });
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve ter estado inicial correto', () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    expect(result.current.filters).toEqual({
      status: 'pendentes',
      q: '',
      classId: '',
      bimester: '',
      type: '',
      page: 1,
      pageSize: 10,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve carregar dados quando os filtros mudam', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Test' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    mockLoadData.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    await waitFor(() => {
      expect(mockLoadData).toHaveBeenCalledWith({
        status: 'pendentes',
        q: '',
        classId: '',
        bimester: '',
        type: '',
        page: 1,
        pageSize: 10,
      });
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('deve atualizar filtros corretamente', async () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    act(() => {
      result.current.setStatus('corrigidas');
    });

    expect(result.current.filters.status).toBe('corrigidas');
    expect(result.current.filters.page).toBe(1); // Deve voltar para primeira página

    act(() => {
      result.current.setQuery('João');
    });

    expect(result.current.filters.q).toBe('João');
    expect(result.current.filters.page).toBe(1); // Deve voltar para primeira página

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.filters.page).toBe(2);
  });

  it('deve lidar com erros de carregamento', async () => {
    const error = new Error('Erro de carregamento');
    mockLoadData.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Erro de carregamento');
    });

    expect(result.current.data).toBeNull();
  });

  it('deve recarregar dados quando chamado', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Test' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    mockLoadData.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    // Simula erro
    mockLoadData.mockRejectedValue(new Error('Erro'));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBe('Erro');
  });

  it('deve limpar filtros corretamente', () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    // Define alguns filtros
    act(() => {
      result.current.setQuery('João');
      result.current.setBimester('1');
      result.current.setType('ENEM');
    });

    expect(result.current.filters.q).toBe('João');
    expect(result.current.filters.bimester).toBe('1');
    expect(result.current.filters.type).toBe('ENEM');

    // Limpa filtros
    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.q).toBe('');
    expect(result.current.filters.bimester).toBe('');
    expect(result.current.filters.type).toBe('');
    expect(result.current.filters.page).toBe(1);
  });

  it('deve navegar entre páginas corretamente', () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.filters.page).toBe(3);

    act(() => {
      result.current.goToNextPage();
    });

    expect(result.current.filters.page).toBe(4);

    act(() => {
      result.current.goToPreviousPage();
    });

    expect(result.current.filters.page).toBe(3);

    act(() => {
      result.current.goToFirstPage();
    });

    expect(result.current.filters.page).toBe(1);
  });

  it('deve atualizar pageSize e salvar no localStorage', () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.filters.pageSize).toBe(20);
    expect(result.current.filters.page).toBe(1); // Deve voltar para primeira página
    expect(mockSetPageSize).toHaveBeenCalledWith(20);
  });

  it('deve definir múltiplos filtros de uma vez', () => {
    const { result } = renderHook(() =>
      useDashboardEssays({ loadData: mockLoadData })
    );

    act(() => {
      result.current.setFilters({
        q: 'João',
        bimester: '1',
        type: 'ENEM',
      });
    });

    expect(result.current.filters.q).toBe('João');
    expect(result.current.filters.bimester).toBe('1');
    expect(result.current.filters.type).toBe('ENEM');
    expect(result.current.filters.page).toBe(1); // Deve voltar para primeira página
  });
});

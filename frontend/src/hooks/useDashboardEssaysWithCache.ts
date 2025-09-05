/**
 * Hook especializado para dashboard de redações com cache
 *
 * Funcionalidades:
 * - URL state para todos os filtros e paginação
 * - Memória de preferências no localStorage
 * - Cache stale-while-revalidate para evitar flicker
 * - Sincronização bidirecional entre URL e estado
 * - Validação e sanitização de parâmetros
 * - Persistência de pageSize
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useListPreferences } from './usePreferences';
import { useCachedQuery } from './useCachedQuery';
import { api } from '@/services/api';

export interface DashboardFilters {
  status: 'pendentes' | 'corrigidas';
  q: string;
  classId: string;
  bimester: string;
  type: string;
  page: number;
  pageSize: number;
}

export interface DashboardEssaysData {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UseDashboardEssaysOptions {
  // Validação personalizada
  validate?: (key: string, value: any) => boolean;
  // Transformação personalizada
  transform?: (key: string, value: any) => any;
  // TTL do cache em ms
  cacheTtlMs?: number;
}

export interface UseDashboardEssaysReturn {
  // Estado atual
  filters: DashboardFilters;
  data: DashboardEssaysData | null;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Funções para manipular filtros
  setStatus: (status: 'pendentes' | 'corrigidas') => void;
  setQuery: (q: string) => void;
  setClassId: (classId: string) => void;
  setBimester: (bimester: string) => void;
  setType: (type: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (
    filters: Partial<Omit<DashboardFilters, 'page' | 'pageSize'>>
  ) => void;

  // Funções de paginação
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Funções utilitárias
  reload: () => Promise<void>;
  clearFilters: () => void;
  reset: () => void;

  // Estado de loading da URL
  isUrlLoading: boolean;

  // Estado do cache
  isStale: boolean;
  isFresh: boolean;
}

const DEFAULT_FILTERS: DashboardFilters = {
  status: 'pendentes',
  q: '',
  classId: '',
  bimester: '',
  type: '',
  page: 1,
  pageSize: 10,
};

export function useDashboardEssaysWithCache(
  options: UseDashboardEssaysOptions = {}
): UseDashboardEssaysReturn {
  const { validate, transform, cacheTtlMs = 30000 } = options;
  const location = useLocation();
  const navigate = useNavigate();

  // Hook de preferências para pageSize
  const { pageSize: savedPageSize, setPageSize: savePageSize } =
    useListPreferences();

  // Estado local
  const [filters, setFiltersState] =
    useState<DashboardFilters>(DEFAULT_FILTERS);
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  // Função para validar parâmetros
  const validateParam = useCallback(
    (key: string, value: any): boolean => {
      if (validate) {
        return validate(key, value);
      }

      switch (key) {
        case 'status':
          return ['pendentes', 'corrigidas'].includes(value);
        case 'page':
        case 'pageSize':
          return typeof value === 'number' && value > 0;
        case 'bimester':
          return ['', '1', '2', '3', '4'].includes(value);
        case 'type':
          return ['', 'ENEM', 'PAS'].includes(value);
        default:
          return true;
      }
    },
    [validate]
  );

  // Função para transformar parâmetros
  const transformParam = useCallback(
    (key: string, value: any): any => {
      if (transform) {
        return transform(key, value);
      }

      switch (key) {
        case 'page':
        case 'pageSize':
          return Number(value);
        default:
          return value;
      }
    },
    [transform]
  );

  // Função para ler parâmetros da URL
  const readParamsFromURL = useCallback((): Partial<DashboardFilters> => {
    const searchParams = new URLSearchParams(location.search);
    const result: Partial<DashboardFilters> = {};

    for (const [key, value] of searchParams.entries()) {
      if (value) {
        const transformedValue = transformParam(key, value);
        if (validateParam(key, transformedValue)) {
          result[key as keyof DashboardFilters] = transformedValue;
        }
      }
    }

    return result;
  }, [location.search, transformParam, validateParam]);

  // Função para escrever parâmetros na URL
  const writeParamsToURL = useCallback(
    (newFilters: DashboardFilters) => {
      const searchParams = new URLSearchParams();

      // Adiciona parâmetros não vazios
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 0) {
          searchParams.set(key, value.toString());
        }
      });

      const newSearch = searchParams.toString();
      const newURL = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;

      if (newURL !== location.pathname + location.search) {
        setIsUrlLoading(true);
        navigate(newURL, { replace: true });
        // Simula um pequeno delay para mostrar loading
        setTimeout(() => setIsUrlLoading(false), 100);
      }
    },
    [location.pathname, location.search, navigate]
  );

  // Função para carregar dados
  const loadData = useCallback(
    async (filters: DashboardFilters): Promise<DashboardEssaysData> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/essays?${params.toString()}`);
      return response.data;
    },
    []
  );

  // Hook de cache para os dados
  const cacheKey = `dashboard_essays_${JSON.stringify(filters)}`;
  const { data, isLoading, isRefreshing, error, refresh, isStale, isFresh } =
    useCachedQuery(cacheKey, () => loadData(filters), {
      ttlMs: cacheTtlMs,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    });

  // Carrega parâmetros da URL na inicialização
  useEffect(() => {
    const urlParams = readParamsFromURL();
    const newFilters = {
      ...DEFAULT_FILTERS,
      pageSize: savedPageSize,
      ...urlParams,
    };
    setFiltersState(prev => {
      // Só atualiza se os filtros realmente mudaram
      const hasChanges = Object.keys(newFilters).some(
        key =>
          prev[key as keyof DashboardFilters] !==
          newFilters[key as keyof DashboardFilters]
      );

      if (!hasChanges) {
        return prev;
      }

      return newFilters;
    });
  }, [location.search, transformParam, validateParam, savedPageSize]);

  // Função para definir um filtro
  const setFilter = useCallback(
    (key: keyof DashboardFilters, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFiltersState(newFilters);
      writeParamsToURL(newFilters);
    },
    [filters, writeParamsToURL]
  );

  // Função para definir múltiplos filtros
  const setMultipleFilters = useCallback(
    (updates: Partial<DashboardFilters>) => {
      const newFilters = { ...filters, ...updates };
      setFiltersState(newFilters);
      writeParamsToURL(newFilters);
    },
    [filters, writeParamsToURL]
  );

  // Funções específicas para cada filtro
  const setStatus = useCallback(
    (status: 'pendentes' | 'corrigidas') => {
      setFilter('status', status);
      setFilter('page', 1); // Volta para primeira página
    },
    [setFilter]
  );

  const setQuery = useCallback(
    (q: string) => {
      setFilter('q', q);
      setFilter('page', 1); // Volta para primeira página
    },
    [setFilter]
  );

  const setClassId = useCallback(
    (classId: string) => {
      setFilter('classId', classId);
      setFilter('page', 1); // Volta para primeira página
    },
    [setFilter]
  );

  const setBimester = useCallback(
    (bimester: string) => {
      setFilter('bimester', bimester);
      setFilter('page', 1); // Volta para primeira página
    },
    [setFilter]
  );

  const setType = useCallback(
    (type: string) => {
      setFilter('type', type);
      setFilter('page', 1); // Volta para primeira página
    },
    [setFilter]
  );

  const setPage = useCallback(
    (page: number) => {
      setFilter('page', page);
    },
    [setFilter]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      setFilter('pageSize', pageSize);
      setFilter('page', 1); // Volta para primeira página
      // Salva no localStorage
      savePageSize(pageSize);
    },
    [setFilter, savePageSize]
  );

  const setFilters = useCallback(
    (newFilters: Partial<Omit<DashboardFilters, 'page' | 'pageSize'>>) => {
      setMultipleFilters({ ...newFilters, page: 1 });
    },
    [setMultipleFilters]
  );

  // Funções de paginação
  const goToPage = useCallback(
    (page: number) => {
      if (data && page >= 1 && page <= data.totalPages) {
        setPage(page);
      }
    },
    [data, setPage]
  );

  const goToNextPage = useCallback(() => {
    if (data && data.hasNextPage) {
      setPage(filters.page + 1);
    }
  }, [data, filters.page, setPage]);

  const goToPreviousPage = useCallback(() => {
    if (data && data.hasPreviousPage) {
      setPage(filters.page - 1);
    }
  }, [data, filters.page, setPage]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const goToLastPage = useCallback(() => {
    if (data) {
      setPage(data.totalPages);
    }
  }, [data, setPage]);

  // Função para recarregar dados
  const reload = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      ...DEFAULT_FILTERS,
      pageSize: savedPageSize,
    };
    setFiltersState(clearedFilters);
    writeParamsToURL(clearedFilters);
  }, [savedPageSize, writeParamsToURL]);

  // Função para resetar tudo
  const reset = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    writeParamsToURL(DEFAULT_FILTERS);
  }, [writeParamsToURL]);

  return {
    filters,
    data,
    loading: isLoading,
    isRefreshing,
    error,
    setStatus,
    setQuery,
    setClassId,
    setBimester,
    setType,
    setPage,
    setPageSize,
    setFilters,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    reload,
    clearFilters,
    reset,
    isUrlLoading,
    isStale,
    isFresh,
  };
}

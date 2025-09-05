/**
 * Hook para gerenciar query parameters da URL
 *
 * Funcionalidades:
 * - Leitura e escrita de parâmetros da URL
 * - Sincronização bidirecional com estado
 * - Validação e sanitização de valores
 * - Preservação de outros parâmetros existentes
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface QueryParams {
  [key: string]: string | undefined;
}

export interface UseQueryParamsOptions {
  // Parâmetros que devem ser preservados mesmo quando não estão no estado
  preserve?: string[];
  // Função para validar valores antes de aplicar
  validate?: (key: string, value: string) => boolean;
  // Função para transformar valores ao ler da URL
  transform?: (key: string, value: string) => any;
}

export interface UseQueryParamsReturn {
  // Estado atual dos parâmetros
  params: QueryParams;

  // Funções para manipular parâmetros
  setParam: (key: string, value: string | undefined) => void;
  setParams: (updates: Partial<QueryParams>) => void;
  removeParam: (key: string) => void;
  clearParams: () => void;

  // Funções utilitárias
  getParam: (key: string) => string | undefined;
  hasParam: (key: string) => boolean;

  // Estado de loading (durante navegação)
  isLoading: boolean;
}

export function useQueryParams(
  initialParams: QueryParams = {},
  options: UseQueryParamsOptions = {}
): UseQueryParamsReturn {
  const { preserve = [], validate, transform } = options;
  const location = useLocation();
  const navigate = useNavigate();

  const [params, setParamsState] = useState<QueryParams>(initialParams);
  const [isLoading, setIsLoading] = useState(false);

  // Função para ler parâmetros da URL
  const readParamsFromURL = useCallback((): QueryParams => {
    const searchParams = new URLSearchParams(location.search);
    const result: QueryParams = {};

    for (const [key, value] of searchParams.entries()) {
      if (value) {
        const transformedValue = transform ? transform(key, value) : value;
        result[key] = transformedValue;
      }
    }

    return result;
  }, [location.search, transform]);

  // Função para escrever parâmetros na URL
  const writeParamsToURL = useCallback(
    (newParams: QueryParams) => {
      const searchParams = new URLSearchParams(location.search);

      // Preserva parâmetros especificados
      preserve.forEach(key => {
        if (searchParams.has(key) && !(key in newParams)) {
          // Mantém o valor existente se não foi removido explicitamente
        }
      });

      // Atualiza parâmetros
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          searchParams.delete(key);
        } else {
          // Valida valor se função de validação for fornecida
          if (validate && !validate(key, value)) {
            console.warn(`Invalid value for parameter ${key}: ${value}`);
            return;
          }
          searchParams.set(key, value);
        }
      });

      const newSearch = searchParams.toString();
      const newURL = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;

      if (newURL !== location.pathname + location.search) {
        setIsLoading(true);
        navigate(newURL, { replace: true });
        // Simula um pequeno delay para mostrar loading
        setTimeout(() => setIsLoading(false), 100);
      }
    },
    [location.pathname, location.search, navigate, preserve, validate]
  );

  // Carrega parâmetros da URL na inicialização
  useEffect(() => {
    const urlParams = readParamsFromURL();
    setParamsState(prev => {
      // Só atualiza se os parâmetros realmente mudaram
      const hasChanges =
        Object.keys(urlParams).some(key => prev[key] !== urlParams[key]) ||
        Object.keys(prev).some(key => !(key in urlParams));

      if (!hasChanges) {
        return prev;
      }

      return { ...prev, ...urlParams };
    });
  }, [location.search, transform]);

  // Função para definir um parâmetro
  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const newParams = { ...params, [key]: value };
      setParamsState(newParams);
      writeParamsToURL(newParams);
    },
    [params, writeParamsToURL]
  );

  // Função para definir múltiplos parâmetros
  const setParams = useCallback(
    (updates: Partial<QueryParams>) => {
      const newParams = { ...params, ...updates };
      setParamsState(newParams);
      writeParamsToURL(newParams);
    },
    [params, writeParamsToURL]
  );

  // Função para remover um parâmetro
  const removeParam = useCallback(
    (key: string) => {
      const newParams = { ...params };
      delete newParams[key];
      setParamsState(newParams);
      writeParamsToURL(newParams);
    },
    [params, writeParamsToURL]
  );

  // Função para limpar todos os parâmetros
  const clearParams = useCallback(() => {
    setParamsState({});
    writeParamsToURL({});
  }, [writeParamsToURL]);

  // Função para obter um parâmetro
  const getParam = useCallback(
    (key: string) => {
      return params[key];
    },
    [params]
  );

  // Função para verificar se um parâmetro existe
  const hasParam = useCallback(
    (key: string) => {
      return key in params && params[key] !== undefined;
    },
    [params]
  );

  return {
    params,
    setParam,
    setParams,
    removeParam,
    clearParams,
    getParam,
    hasParam,
    isLoading,
  };
}

/**
 * Hook especializado para dashboard de redações
 */
export function useDashboardQueryParams() {
  const { params, setParam, setParams, isLoading } = useQueryParams(
    {
      status: 'pendentes',
      page: '1',
      pageSize: '10',
      q: '',
      classId: '',
      bimester: '',
      type: '',
    },
    {
      preserve: ['status'], // Sempre preserva o status
      validate: (key, value) => {
        switch (key) {
          case 'page':
          case 'pageSize':
            return !isNaN(Number(value)) && Number(value) > 0;
          case 'status':
            return ['pendentes', 'corrigidas'].includes(value);
          case 'bimester':
            return ['', '1', '2', '3', '4'].includes(value);
          case 'type':
            return ['', 'ENEM', 'PAS'].includes(value);
          default:
            return true;
        }
      },
      transform: (key, value) => {
        switch (key) {
          case 'page':
          case 'pageSize':
            return Number(value);
          default:
            return value;
        }
      },
    }
  );

  return {
    // Parâmetros tipados
    status: params.status || 'pendentes',
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 10,
    q: params.q || '',
    classId: params.classId || '',
    bimester: params.bimester || '',
    type: params.type || '',

    // Funções
    setStatus: (status: string) => setParam('status', status),
    setPage: (page: number) => setParam('page', page.toString()),
    setPageSize: (pageSize: number) =>
      setParam('pageSize', pageSize.toString()),
    setQuery: (q: string) => setParam('q', q),
    setClassId: (classId: string) => setParam('classId', classId),
    setBimester: (bimester: string) => setParam('bimester', bimester),
    setType: (type: string) => setParam('type', type),
    setFilters: (
      filters: Partial<{
        q: string;
        classId: string;
        bimester: string;
        type: string;
      }>
    ) => setParams(filters),

    isLoading,
  };
}

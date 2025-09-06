/**
 * Hook para consultas com cache (stale-while-revalidate)
 *
 * Características:
 * - Serve dados do cache imediatamente se disponíveis
 * - Revalida em background se stale
 * - Evita requests duplicados
 * - Loading states inteligentes
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCache,
  setCache,
  hasFreshCache,
  isStaleCache,
  subscribeCache,
} from '@/lib/cache';
import { useRevalidationConfig, useLocalRevalidation } from '@/providers/DataProvider';

export interface UseCachedQueryOptions {
  ttlMs?: number;
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

export interface UseCachedQueryReturn<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
  isStale: boolean;
  isFresh: boolean;
}

// Cache de requests em andamento para evitar duplicatas
const pendingRequests = new Map<string, Promise<any>>();

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {}
): UseCachedQueryReturn<T> {
  // Configurações globais de revalidação
  const globalConfig = useRevalidationConfig();
  
  // Configurações locais (podem sobrescrever as globais)
  const localConfig = useLocalRevalidation(key, {
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    refetchOnReconnect: options.refetchOnReconnect,
    refetchOnMount: options.refetchOnMount,
  });
  
  const {
    ttlMs = 30000,
    enabled = true,
    refetchOnMount = localConfig.config.refetchOnMount,
    refetchOnWindowFocus = localConfig.config.refetchOnWindowFocus,
    refetchOnReconnect = localConfig.config.refetchOnReconnect,
    staleTime = 15000, // 15s para considerar stale
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFresh, setIsFresh] = useState(false);

  const fetcherRef = useRef(fetcher);
  const keyRef = useRef(key);
  const optionsRef = useRef(options);

  // Atualiza refs quando mudam
  useEffect(() => {
    fetcherRef.current = fetcher;
    keyRef.current = key;
    optionsRef.current = options;
  }, [fetcher, key, options]);

  // Função para carregar dados
  const loadData = useCallback(
    async (forceRefresh = false) => {
      const currentKey = keyRef.current;
      const currentFetcher = fetcherRef.current;
      const currentOptions = optionsRef.current;

      if (!enabled) {
        return;
      }

      // Verifica se já há uma requisição em andamento
      if (pendingRequests.has(currentKey) && !forceRefresh) {
        try {
          const result = await pendingRequests.get(currentKey);
          setData(result);
          setError(null);
          return;
        } catch (err: any) {
          setError(err?.message || 'Erro ao carregar dados');
          return;
        }
      }

      // Verifica cache primeiro
      const cachedData = getCache<T>(currentKey);
      const hasFresh = hasFreshCache(currentKey);
      const isStale = isStaleCache(currentKey);

      if (cachedData && !forceRefresh) {
        setData(cachedData);
        setError(null);
        setIsStale(isStale);
        setIsFresh(hasFresh);

        // Se os dados estão frescos, não precisa revalidar
        if (hasFresh) {
          return;
        }

        // Se estão stale, revalida em background
        if (isStale && currentOptions.refetchOnMount !== false) {
          setIsRefreshing(true);
        }
      } else if (!cachedData) {
        // Se não há cache, mostra loading
        setIsLoading(true);
      }

      // Cria promise para evitar duplicatas
      const fetchPromise = (async () => {
        try {
          const result = await currentFetcher();
          setCache(currentKey, result, ttlMs);
          setData(result);
          setError(null);
          setIsStale(false);
          setIsFresh(true);
          return result;
        } catch (err: any) {
          const errorMessage = err?.message || 'Erro ao carregar dados';
          setError(errorMessage);
          throw err;
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          pendingRequests.delete(currentKey);
        }
      })();

      pendingRequests.set(currentKey, fetchPromise);

      try {
        await fetchPromise;
      } catch (err) {
        // Error já foi tratado no promise
      }
    },
    [enabled, ttlMs, key, fetcher]
  );

  // Função para refresh manual
  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // Função para invalidar cache
  const invalidate = useCallback(() => {
    setData(null);
    setError(null);
    setIsStale(false);
    setIsFresh(false);
  }, []);

  // Carrega dados na montagem
  useEffect(() => {
    if (enabled && refetchOnMount) {
      loadData();
    }
  }, [enabled, refetchOnMount, loadData]);

  // Refetch no foco da janela
  useEffect(() => {
    if (!refetchOnWindowFocus) {
      return;
    }

    const handleFocus = () => {
      if (enabled) {
        localConfig.logRevalidation('Window focus');
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refetchOnWindowFocus, loadData, localConfig]);

  // Refetch na reconexão
  useEffect(() => {
    if (!refetchOnReconnect) {
      return;
    }

    const handleOnline = () => {
      if (enabled) {
        localConfig.logRevalidation('Network reconnection');
        loadData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [enabled, refetchOnReconnect, loadData, localConfig]);

  // Subscrição para mudanças no cache
  useEffect(() => {
    const subscription = subscribeCache<T>(key, newData => {
      setData(newData);
      setError(null);
      setIsStale(false);
      setIsFresh(true);
    });

    return () => subscription.unsubscribe();
  }, [key]);

  // Cleanup de requests pendentes
  useEffect(() => {
    return () => {
      pendingRequests.delete(key);
    };
  }, [key]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    invalidate,
    isStale,
    isFresh,
  };
}

// Hook para múltiplas consultas
export function useCachedQueries<T>(
  queries: Array<{
    key: string;
    fetcher: () => Promise<T>;
    options?: UseCachedQueryOptions;
  }>
): Array<UseCachedQueryReturn<T>> {
  return queries.map(({ key, fetcher, options }) =>
    useCachedQuery(key, fetcher, options)
  );
}

// Hook para consultas dependentes
export function useCachedQueryWithDeps<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: any[],
  options: UseCachedQueryOptions = {}
): UseCachedQueryReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFresh, setIsFresh] = useState(false);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!options.enabled !== false) {
        return;
      }

      const cachedData = getCache<T>(key);
      const hasFresh = hasFreshCache(key);
      const isStale = isStaleCache(key);

      if (cachedData && !forceRefresh) {
        setData(cachedData);
        setError(null);
        setIsStale(isStale);
        setIsFresh(hasFresh);

        if (hasFresh) {
          return;
        }

        if (isStale) {
          setIsRefreshing(true);
        }
      } else if (!cachedData) {
        setIsLoading(true);
      }

      try {
        const result = await fetcher();
        setCache(key, result, options.ttlMs);
        setData(result);
        setError(null);
        setIsStale(false);
        setIsFresh(true);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [key, fetcher, options.enabled, options.ttlMs]
  );

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const invalidate = useCallback(() => {
    setData(null);
    setError(null);
    setIsStale(false);
    setIsFresh(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, ...deps]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    invalidate,
    isStale,
    isFresh,
  };
}

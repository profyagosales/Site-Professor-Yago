/**
 * Hook para processamento OMR com revalidação no foco
 * 
 * Este hook ativa revalidação no foco da janela para manter
 * a fila de processamento OMR sempre atualizada.
 */

import { useCachedQuery } from './useCachedQuery';
import { listProcessamentos, listAplicacoes, type ProcessamentoOMR, type AplicacaoGabarito } from '@/services/gabaritos';

export interface UseOMRProcessingOptions {
  ttlMs?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export interface UseOMRProcessingReturn {
  processamentos: ProcessamentoOMR[];
  aplicacoes: AplicacaoGabarito[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isStale: boolean;
  isFresh: boolean;
}

export function useOMRProcessing(
  options: UseOMRProcessingOptions = {}
): UseOMRProcessingReturn {
  const {
    ttlMs = 10000, // 10 segundos para processamento OMR
    refetchOnWindowFocus = true, // Ativar revalidação no foco para fila OMR
    refetchOnReconnect = true,
  } = options;

  // Carregar processamentos com revalidação no foco
  const {
    data: processamentos = [],
    isLoading: isLoadingProcessamentos,
    isRefreshing: isRefreshingProcessamentos,
    error: errorProcessamentos,
    refresh: refreshProcessamentos,
    isStale: isStaleProcessamentos,
    isFresh: isFreshProcessamentos,
  } = useCachedQuery(
    'omr-processamentos',
    listProcessamentos,
    {
      ttlMs,
      refetchOnWindowFocus,
      refetchOnReconnect,
    }
  );

  // Carregar aplicações com revalidação no foco
  const {
    data: aplicacoes = [],
    isLoading: isLoadingAplicacoes,
    isRefreshing: isRefreshingAplicacoes,
    error: errorAplicacoes,
    refresh: refreshAplicacoes,
    isStale: isStaleAplicacoes,
    isFresh: isFreshAplicacoes,
  } = useCachedQuery(
    'omr-aplicacoes',
    listAplicacoes,
    {
      ttlMs,
      refetchOnWindowFocus,
      refetchOnReconnect,
    }
  );

  // Refresh combinado
  const refresh = async () => {
    await Promise.all([refreshProcessamentos(), refreshAplicacoes()]);
  };

  return {
    processamentos,
    aplicacoes,
    isLoading: isLoadingProcessamentos || isLoadingAplicacoes,
    isRefreshing: isRefreshingProcessamentos || isRefreshingAplicacoes,
    error: errorProcessamentos || errorAplicacoes,
    refresh,
    isStale: isStaleProcessamentos || isStaleAplicacoes,
    isFresh: isFreshProcessamentos && isFreshAplicacoes,
  };
}

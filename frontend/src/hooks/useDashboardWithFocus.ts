/**
 * Hook para dashboard com revalidação no foco
 * 
 * Este hook ativa revalidação no foco da janela para manter
 * os dados do dashboard sempre atualizados.
 */

import { useCachedQuery } from './useCachedQuery';
import { getProfessorSummary, getDashboardStats } from '@/services/dashboard';

export interface UseDashboardWithFocusOptions {
  ttlMs?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export interface UseDashboardWithFocusReturn {
  summary: any;
  stats: any;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isStale: boolean;
  isFresh: boolean;
}

export function useDashboardWithFocus(
  options: UseDashboardWithFocusOptions = {}
): UseDashboardWithFocusReturn {
  const {
    ttlMs = 30000, // 30 segundos para dashboard
    refetchOnWindowFocus = true, // Ativar revalidação no foco para dashboard
    refetchOnReconnect = true,
  } = options;

  // Carregar resumo com revalidação no foco
  const {
    data: summary = null,
    isLoading: isLoadingSummary,
    isRefreshing: isRefreshingSummary,
    error: errorSummary,
    refresh: refreshSummary,
    isStale: isStaleSummary,
    isFresh: isFreshSummary,
  } = useCachedQuery(
    'dashboard-summary',
    getProfessorSummary,
    {
      ttlMs,
      refetchOnWindowFocus,
      refetchOnReconnect,
    }
  );

  // Carregar estatísticas com revalidação no foco
  const {
    data: stats = null,
    isLoading: isLoadingStats,
    isRefreshing: isRefreshingStats,
    error: errorStats,
    refresh: refreshStats,
    isStale: isStaleStats,
    isFresh: isFreshStats,
  } = useCachedQuery(
    'dashboard-stats',
    getDashboardStats,
    {
      ttlMs,
      refetchOnWindowFocus,
      refetchOnReconnect,
    }
  );

  // Refresh combinado
  const refresh = async () => {
    await Promise.all([refreshSummary(), refreshStats()]);
  };

  return {
    summary,
    stats,
    isLoading: isLoadingSummary || isLoadingStats,
    isRefreshing: isRefreshingSummary || isRefreshingStats,
    error: errorSummary || errorStats,
    refresh,
    isStale: isStaleSummary || isStaleStats,
    isFresh: isFreshSummary && isFreshStats,
  };
}

/**
 * Hook para gerenciar o cache de forma centralizada
 *
 * Funcionalidades:
 * - Invalidação seletiva de caches
 * - Estatísticas do cache
 * - Limpeza automática
 * - Debugging
 */

import { useCallback, useEffect, useState } from 'react';
import { getCacheStats, clearCache } from '@/lib/cache';

export interface CacheStats {
  total: number;
  fresh: number;
  stale: number;
  expired: number;
}

export interface UseCacheManagerReturn {
  stats: CacheStats;
  refreshStats: () => void;
  clearAllCache: () => void;
  clearExpiredCache: () => void;
  clearStaleCache: () => void;
  isDebugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
}

export function useCacheManager(): UseCacheManagerReturn {
  const [stats, setStats] = useState<CacheStats>({
    total: 0,
    fresh: 0,
    stale: 0,
    expired: 0,
  });
  const [isDebugMode, setIsDebugMode] = useState(false);

  const refreshStats = useCallback(() => {
    const newStats = getCacheStats();
    setStats(newStats);
  }, []);

  const clearAllCache = useCallback(() => {
    clearCache();
    refreshStats();
  }, [refreshStats]);

  const clearExpiredCache = useCallback(() => {
    // Implementação para limpar apenas entradas expiradas
    // Por enquanto, limpa tudo
    clearCache();
    refreshStats();
  }, [refreshStats]);

  const clearStaleCache = useCallback(() => {
    // Implementação para limpar apenas entradas stale
    // Por enquanto, limpa tudo
    clearCache();
    refreshStats();
  }, [refreshStats]);

  const setDebugMode = useCallback(
    (enabled: boolean) => {
      setIsDebugMode(enabled);
      if (enabled) {
        refreshStats();
      }
    },
    [refreshStats]
  );

  // Atualiza estatísticas periodicamente em modo debug
  useEffect(() => {
    if (!isDebugMode) {
      return;
    }

    const interval = setInterval(refreshStats, 5000); // A cada 5 segundos
    return () => clearInterval(interval);
  }, [isDebugMode, refreshStats]);

  // Atualiza estatísticas na montagem
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    refreshStats,
    clearAllCache,
    clearExpiredCache,
    clearStaleCache,
    isDebugMode,
    setDebugMode,
  };
}

// Hook para invalidar caches específicos
export function useCacheInvalidation() {
  const invalidateEssays = useCallback(() => {
    // Remove todos os caches de redações
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (
        key.startsWith('cache_essays_') ||
        key.startsWith('cache_dashboard_essays_')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateClasses = useCallback(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_classes_') || key.startsWith('cache_class_')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateStudents = useCallback(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (
        key.startsWith('cache_students_') ||
        key.startsWith('cache_student_')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateAll = useCallback(() => {
    clearCache();
  }, []);

  return {
    invalidateEssays,
    invalidateClasses,
    invalidateStudents,
    invalidateAll,
  };
}

// Hook para debug do cache
export function useCacheDebug() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback(
    (message: string) => {
      if (!isEnabled) return;

      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`]);
    },
    [isEnabled]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const toggleDebug = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (!isEnabled) {
      clearLogs();
    }
  }, [isEnabled, clearLogs]);

  return {
    isEnabled,
    logs,
    addLog,
    clearLogs,
    toggleDebug,
  };
}

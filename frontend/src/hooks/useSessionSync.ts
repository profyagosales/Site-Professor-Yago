/**
 * Hook para sincronização de sessão entre abas
 *
 * Monitora mudanças no localStorage para sincronizar logout/login
 * entre diferentes abas do navegador
 */

import { useEffect, useCallback } from 'react';
import { SESSION_STORAGE_KEY } from '@/config/auth';
import { performLogout } from '@/services/session';
import { logger } from '@/lib/logger';

interface UseSessionSyncOptions {
  onSessionChange?: (hasSession: boolean) => void;
  enabled?: boolean;
}

export function useSessionSync({
  onSessionChange,
  enabled = true,
}: UseSessionSyncOptions = {}) {
  const handleStorageChange = useCallback(
    (event: StorageEvent) => {
      // Só processa mudanças na chave de sessão
      if (event.key !== SESSION_STORAGE_KEY) return;

      logger.info('Session storage changed', {
        component: 'useSessionSync',
        action: 'storageChange',
        key: event.key,
        newValue: event.newValue,
        oldValue: event.oldValue,
      });

      // Se a sessão foi removida (logout em outra aba)
      if (event.newValue === null && event.oldValue !== null) {
        logger.info('Session removed in another tab, performing logout', {
          component: 'useSessionSync',
          action: 'syncLogout',
        });

        performLogout('MANUAL');
        onSessionChange?.(false);
        return;
      }

      // Se uma nova sessão foi criada (login em outra aba)
      if (event.newValue !== null && event.oldValue === null) {
        logger.info('New session created in another tab', {
          component: 'useSessionSync',
          action: 'syncLogin',
        });

        onSessionChange?.(true);
        return;
      }

      // Se a sessão foi atualizada
      if (event.newValue !== null && event.oldValue !== null) {
        logger.info('Session updated in another tab', {
          component: 'useSessionSync',
          action: 'syncUpdate',
        });

        onSessionChange?.(true);
        return;
      }
    },
    [onSessionChange]
  );

  useEffect(() => {
    if (!enabled) return;

    // Adiciona listener para mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange, enabled]);

  // Função para forçar sincronização (útil para debug)
  const forceSync = useCallback(() => {
    const currentSession = localStorage.getItem(SESSION_STORAGE_KEY);
    onSessionChange?.(currentSession !== null);
  }, [onSessionChange]);

  return {
    forceSync,
  };
}

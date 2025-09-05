/**
 * Hook unificado para gerenciamento de sessão
 *
 * Combina idle timer, sincronização entre abas e validação de TTL
 */

import { useEffect, useCallback, useState } from 'react';
import { useIdleTimer } from './useIdleTimer';
import { useSessionSync } from './useSessionSync';
import {
  validateSession,
  updateLastActivity,
  performLogout,
  getSessionInfo,
  setSessionCallbacks,
  type SessionData,
} from '@/services/session';
import { IDLE_TIMEOUT, LOGOUT_MESSAGES } from '@/config/auth';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';

interface UseSessionOptions {
  onSessionChange?: (hasSession: boolean) => void;
  onLogout?: (reason: keyof typeof LOGOUT_MESSAGES) => void;
  enabled?: boolean;
}

export function useSession({
  onSessionChange,
  onLogout,
  enabled = true,
}: UseSessionOptions = {}) {
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const [isValidating, setIsValidating] = useState(false);

  // Callback para logout
  const handleLogout = useCallback(
    (reason: keyof typeof LOGOUT_MESSAGES) => {
      logger.info('Session logout triggered', {
        component: 'useSession',
        action: 'handleLogout',
        reason,
      });

      // Mostra toast apropriado
      const message = LOGOUT_MESSAGES[reason];
      if (message) {
        toast.info(message, {
          autoClose: 5000,
          position: 'top-right',
        });
      }

      // Notifica callback
      onLogout?.(reason);
      onSessionChange?.(false);

      // Atualiza estado
      setSessionInfo(getSessionInfo());
    },
    [onLogout, onSessionChange]
  );

  // Callback para expiração de sessão
  const handleSessionExpired = useCallback(() => {
    logger.info('Session expired', {
      component: 'useSession',
      action: 'handleSessionExpired',
    });

    performLogout('EXPIRED');
    onSessionChange?.(false);
    setSessionInfo(getSessionInfo());
  }, [onSessionChange]);

  // Callback para timeout de inatividade
  const handleIdleTimeout = useCallback(() => {
    logger.info('Idle timeout reached', {
      component: 'useSession',
      action: 'handleIdleTimeout',
    });

    performLogout('IDLE');
    onSessionChange?.(false);
    setSessionInfo(getSessionInfo());
  }, [onSessionChange]);

  // Callback para quando usuário volta a ficar ativo
  const handleUserActive = useCallback(() => {
    logger.info('User became active', {
      component: 'useSession',
      action: 'handleUserActive',
    });

    // Atualiza última atividade
    updateLastActivity();
    setSessionInfo(getSessionInfo());
  }, []);

  // Configura callbacks do sistema de sessão
  useEffect(() => {
    setSessionCallbacks({
      onLogout: handleLogout,
      onSessionExpired: handleSessionExpired,
      onIdleTimeout: handleIdleTimeout,
    });

    return () => {
      setSessionCallbacks(null);
    };
  }, [handleLogout, handleSessionExpired, handleIdleTimeout]);

  // Hook de idle timer
  const { reset: resetIdleTimer } = useIdleTimer({
    timeout: IDLE_TIMEOUT,
    onIdle: handleIdleTimeout,
    onActive: handleUserActive,
    enabled: enabled && sessionInfo.hasSession,
  });

  // Hook de sincronização entre abas
  const { forceSync } = useSessionSync({
    onSessionChange: hasSession => {
      onSessionChange?.(hasSession);
      setSessionInfo(getSessionInfo());
    },
    enabled,
  });

  // Validação periódica da sessão
  useEffect(() => {
    if (!enabled || !sessionInfo.hasSession) return;

    const validateInterval = setInterval(() => {
      setIsValidating(true);

      const validation = validateSession();
      if (!validation.isValid) {
        logger.warn('Session validation failed', {
          component: 'useSession',
          action: 'validateSession',
          reason: validation.reason,
        });

        if (validation.reason === 'Session expired by TTL') {
          handleSessionExpired();
        } else if (validation.reason === 'Session expired by inactivity') {
          handleIdleTimeout();
        } else {
          performLogout('EXPIRED');
          onSessionChange?.(false);
        }
      } else {
        // Atualiza informações da sessão
        setSessionInfo(getSessionInfo());
      }

      setIsValidating(false);
    }, 30000); // Valida a cada 30 segundos

    return () => {
      clearInterval(validateInterval);
    };
  }, [
    enabled,
    sessionInfo.hasSession,
    handleSessionExpired,
    handleIdleTimeout,
    onSessionChange,
  ]);

  // Função para atualizar última atividade manualmente
  const updateActivity = useCallback(() => {
    updateLastActivity();
    resetIdleTimer();
    setSessionInfo(getSessionInfo());
  }, [resetIdleTimer]);

  // Função para fazer logout manual
  const logout = useCallback(() => {
    performLogout('MANUAL');
    onSessionChange?.(false);
    setSessionInfo(getSessionInfo());
  }, [onSessionChange]);

  // Função para forçar sincronização
  const sync = useCallback(() => {
    forceSync();
    setSessionInfo(getSessionInfo());
  }, [forceSync]);

  // Função para obter informações da sessão
  const getInfo = useCallback(() => {
    const info = getSessionInfo();
    setSessionInfo(info);
    return info;
  }, []);

  return {
    // Estado
    sessionInfo,
    isValidating,

    // Ações
    updateActivity,
    logout,
    sync,
    getInfo,
    resetIdleTimer,
  };
}

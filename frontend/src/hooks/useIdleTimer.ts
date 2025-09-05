/**
 * Hook para detectar inatividade do usuário
 *
 * Monitora eventos de mouse, teclado e touch para detectar quando o usuário
 * está inativo e pode executar ações como logout automático
 */

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseIdleTimerOptions {
  timeout: number; // timeout em ms
  onIdle: () => void; // callback executado quando inativo
  onActive?: () => void; // callback executado quando volta a ficar ativo
  events?: string[]; // eventos a serem monitorados
  enabled?: boolean; // se o timer está habilitado
}

const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
] as const;

export function useIdleTimer({
  timeout,
  onIdle,
  onActive,
  events = DEFAULT_EVENTS,
  enabled = true,
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    lastActivityRef.current = now;

    // Se estava inativo e agora está ativo, chama onActive
    if (isIdleRef.current && onActive) {
      isIdleRef.current = false;
      onActive();
      logger.info('User became active', {
        component: 'useIdleTimer',
        action: 'user_active',
        lastActivity: new Date(lastActivityRef.current).toISOString(),
      });
    }

    // Limpa timer anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agenda novo timer
    timeoutRef.current = setTimeout(() => {
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        logger.info('User became idle', {
          component: 'useIdleTimer',
          action: 'user_idle',
          timeout: timeout,
          lastActivity: new Date(lastActivityRef.current).toISOString(),
        });
        onIdle();
      }
    }, timeout);
  }, [timeout, onIdle, onActive, enabled]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Adiciona listeners para os eventos
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Inicia o timer
    resetTimer();

    return () => {
      // Remove listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Limpa timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [events, handleActivity, resetTimer, enabled]);

  // Função para resetar manualmente o timer
  const reset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Função para obter o tempo desde a última atividade
  const getLastActivity = useCallback(() => {
    return lastActivityRef.current;
  }, []);

  // Função para verificar se está inativo
  const isIdle = useCallback(() => {
    return isIdleRef.current;
  }, []);

  return {
    reset,
    getLastActivity,
    isIdle,
  };
}

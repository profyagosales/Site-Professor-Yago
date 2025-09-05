/**
 * Hook para gerenciar modo offline e degradação de funcionalidades
 *
 * Características:
 * - Detecta quando backend está indisponível
 * - Fornece utilitários para degradação de UI
 * - Bloqueia ações que requerem rede
 * - Logs de ações bloqueadas
 */

import { useBackendHealth } from '@/services/health';
import { useNetworkStatus } from './useNetworkStatus';
import { logger } from '@/lib/logger';

export interface OfflineModeState {
  isOffline: boolean;
  isBackendDown: boolean;
  isNetworkDown: boolean;
  shouldBlockAction: (action: string) => boolean;
  getDisabledProps: (action: string) => { disabled: boolean; title?: string };
  logBlockedAction: (action: string, context?: any) => void;
}

/**
 * Hook para gerenciar modo offline
 * @returns Estado e funções para degradação
 */
export function useOfflineMode(): OfflineModeState {
  const { isOnline } = useNetworkStatus();
  const { isHealthy } = useBackendHealth();

  const isNetworkDown = !isOnline;
  const isBackendDown = isOnline && !isHealthy;
  const isOffline = isNetworkDown || isBackendDown;

  /**
   * Verifica se uma ação deve ser bloqueada
   */
  const shouldBlockAction = (action: string): boolean => {
    if (!isOffline) return false;

    // Log da ação bloqueada
    logger.warn('Ação bloqueada - sistema offline', {
      component: 'useOfflineMode',
      action: 'block_action',
      blockedAction: action,
      isNetworkDown,
      isBackendDown,
    });

    return true;
  };

  /**
   * Retorna props para desabilitar elementos UI
   */
  const getDisabledProps = (action: string) => {
    const disabled = shouldBlockAction(action);

    if (!disabled) {
      return { disabled: false };
    }

    const title = isNetworkDown
      ? 'Sem conexão com a internet'
      : 'Serviço temporariamente indisponível';

    return {
      disabled: true,
      title,
    };
  };

  /**
   * Log de ação bloqueada com contexto
   */
  const logBlockedAction = (action: string, context?: any) => {
    if (shouldBlockAction(action)) {
      logger.warn('Ação bloqueada - sistema offline', {
        component: 'useOfflineMode',
        action: 'log_blocked_action',
        blockedAction: action,
        context,
        isNetworkDown,
        isBackendDown,
      });
    }
  };

  return {
    isOffline,
    isBackendDown,
    isNetworkDown,
    shouldBlockAction,
    getDisabledProps,
    logBlockedAction,
  };
}

/**
 * Hook específico para botões que requerem rede
 * @param action - Nome da ação para logging
 * @returns Props para o botão
 */
export function useOfflineButton(action: string) {
  const { getDisabledProps, isOffline } = useOfflineMode();

  return {
    ...getDisabledProps(action),
    className: isOffline ? 'opacity-50 cursor-not-allowed' : '',
  };
}

/**
 * Hook específico para formulários que requerem rede
 * @param action - Nome da ação para logging
 * @returns Props para o formulário
 */
export function useOfflineForm(action: string) {
  const { shouldBlockAction, isOffline } = useOfflineMode();

  const handleSubmit = (originalHandler: (e: any) => void) => (e: any) => {
    if (shouldBlockAction(action)) {
      e.preventDefault();
      return;
    }
    originalHandler(e);
  };

  return {
    onSubmit: handleSubmit,
    className: isOffline ? 'opacity-75 pointer-events-none' : '',
  };
}

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface UseFlagsShortcutProps {
  onToggle: () => void;
  enabled?: boolean;
}

/**
 * Hook para gerenciar o atalho Ctrl+Alt+F para abrir o painel de flags
 *
 * @param onToggle Função chamada quando o atalho é pressionado
 * @param enabled Se o atalho está habilitado (padrão: true em DEV ou com debug ativo)
 */
export function useFlagsShortcut({ onToggle, enabled }: UseFlagsShortcutProps) {
  useEffect(() => {
    // Só ativar em DEV ou com debug ativo
    const isDebugMode =
      import.meta.env.DEV || localStorage.getItem('debug') === '1';
    if (!enabled && !isDebugMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+Alt+F
      if (event.ctrlKey && event.altKey && event.key === 'f') {
        event.preventDefault();
        event.stopPropagation();

        logger.info('Flags shortcut triggered', {
          component: 'useFlagsShortcut',
          action: 'shortcut',
          key: 'Ctrl+Alt+F',
        });

        onToggle();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggle, enabled]);

  // Retornar informações sobre o atalho para debug
  return {
    shortcut: 'Ctrl+Alt+F',
    enabled:
      enabled ?? (import.meta.env.DEV || localStorage.getItem('debug') === '1'),
  };
}

import { logger } from '@/lib/logger';

interface UseFlagsShortcutProps {
  onToggle: () => void;
  enabled?: boolean;
}

/**
 * Hook para gerenciar o atalho Ctrl+Alt+F para abrir o painel de flags
 *
 * @param onToggle Função chamada quando o atalho é pressionado
 * @param enabled Se o atalho está habilitado (padrão: true em DEV ou com debug ativo)
 */
export function useFlagsShortcut({ onToggle, enabled }: UseFlagsShortcutProps) {
  useEffect(() => {
    // Só ativar em DEV ou com debug ativo
    const isDebugMode =
      import.meta.env.DEV || localStorage.getItem('debug') === '1';
    if (!enabled && !isDebugMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+Alt+F
      if (event.ctrlKey && event.altKey && event.key === 'f') {
        event.preventDefault();
        event.stopPropagation();

        logger.info('Flags shortcut triggered', {
          component: 'useFlagsShortcut',
          action: 'shortcut',
          key: 'Ctrl+Alt+F',
        });

        onToggle();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggle, enabled]);

  // Retornar informações sobre o atalho para debug
  return {
    shortcut: 'Ctrl+Alt+F',
    enabled:
      enabled ?? (import.meta.env.DEV || localStorage.getItem('debug') === '1'),
  };
}

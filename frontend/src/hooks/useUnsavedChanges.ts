import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from './useConfirm';

interface UseUnsavedChangesOptions {
  hasChanges: boolean;
  message?: string;
  onBeforeUnload?: () => void;
}

export function useUnsavedChanges({
  hasChanges,
  message = 'Você tem alterações não salvas. Tem certeza que deseja sair?',
  onBeforeUnload,
}: UseUnsavedChangesOptions) {
  const confirm = useConfirm();
  const hasChangesRef = useRef(hasChanges);

  // Atualizar ref quando hasChanges muda
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Proteção beforeunload para saída da página
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        event.preventDefault();
        event.returnValue = message;

        if (onBeforeUnload) {
          onBeforeUnload();
        }

        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message, onBeforeUnload]);

  // Bloquear navegação entre rotas
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChangesRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Mostrar modal de confirmação quando bloqueado
  useEffect(() => {
    if (blocker.state === 'blocked') {
      confirm({
        title: 'Alterações não salvas',
        message,
        type: 'warning',
        confirmText: 'Sair sem salvar',
        cancelText: 'Cancelar',
      }).then(confirmed => {
        if (confirmed) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      });
    }
  }, [blocker, confirm, message]);

  return {
    hasChanges,
    // Função para limpar mudanças (útil após salvar)
    clearChanges: () => {
      hasChangesRef.current = false;
    },
  };
}

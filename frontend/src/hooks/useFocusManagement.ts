import { useEffect, useRef } from 'react';

/**
 * Hook para gerenciar foco em modais
 * - Ao abrir: foca no primeiro elemento interativo
 * - Ao fechar: devolve foco ao elemento que abriu o modal
 */
export function useFocusManagement(
  isOpen: boolean,
  focusableSelector = 'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Salvar elemento ativo antes de abrir o modal
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focar no primeiro elemento interativo do modal
      const focusableElement = modalRef.current?.querySelector(
        focusableSelector
      ) as HTMLElement;
      if (focusableElement) {
        // Usar setTimeout para garantir que o modal esteja renderizado
        setTimeout(() => {
          focusableElement.focus();
        }, 0);
      }
    } else {
      // Devolver foco ao elemento anterior
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
  }, [isOpen, focusableSelector]);

  return modalRef;
}

/**
 * Hook para gerenciar foco em toasts/notificações
 * - Adiciona role="status" e aria-live="polite"
 */
export function useToastAccessibility() {
  useEffect(() => {
    // Configurar toasts para serem acessíveis
    const toastContainer = document.querySelector('.Toastify__toast-container');
    if (toastContainer) {
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('role', 'status');
    }
  }, []);
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Tipos para toasts
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Tipos para modais
export interface Modal {
  id: string;
  component: ReactNode;
  onClose?: () => void;
}

// Contexto
interface UIContextType {
  // Toasts
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  
  // Modais
  modals: Modal[];
  showModal: (component: ReactNode, onClose?: () => void) => string;
  hideModal: (id: string) => void;
  clearModals: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

// Provider
export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modals, setModals] = useState<Modal[]>([]);

  // Toast functions
  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove toast
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Modal functions
  const showModal = useCallback((component: ReactNode, onClose?: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    const modal: Modal = { id, component, onClose };
    
    setModals(prev => [...prev, modal]);
    return id;
  }, []);

  const hideModal = useCallback((id: string) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const clearModals = useCallback(() => {
    setModals([]);
  }, []);

  const value: UIContextType = {
    toasts,
    showToast,
    hideToast,
    clearToasts,
    modals,
    showModal,
    hideModal,
    clearModals,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <ToastContainer />
      <ModalContainer />
    </UIContext.Provider>
  );
}

// Hook para usar o contexto
export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

// Componente de container de toasts
function ToastContainer() {
  const { toasts, hideToast } = useUI();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

// Componente individual de toast
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-orange-50 border-orange-200 text-orange-800';
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ${getToastStyles(toast.type)}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg font-bold">{getIcon(toast.type)}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Fechar notificação"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de container de modais
function ModalContainer() {
  const { modals, hideModal } = useUI();

  return (
    <>
      {modals.map(modal => (
        <div key={modal.id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative">
            <button
              onClick={() => hideModal(modal.id)}
              className="absolute -top-2 -right-2 z-10 rounded-full bg-white p-1 shadow-lg hover:bg-gray-50"
              aria-label="Fechar modal"
            >
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {modal.component}
          </div>
        </div>
      ))}
    </>
  );
}

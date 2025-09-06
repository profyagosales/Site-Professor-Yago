import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Provider de toasts com acessibilidade melhorada
 */
export function ToastProvider() {
  useEffect(() => {
    // Configurar toasts para serem acessíveis
    const toastContainer = document.querySelector('.Toastify__toast-container');
    if (toastContainer) {
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('role', 'status');
      toastContainer.setAttribute('aria-label', 'Notificações');
    }
  }, []);

  return (
    <ToastContainer
      position='top-right'
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme='light'
      toastClassName='toast-accessible'
      bodyClassName='toast-body-accessible'
      // Configurações de acessibilidade
      closeButton={({ closeToast }) => (
        <button
          onClick={closeToast}
          className='Toastify__close-button'
          aria-label='Fechar notificação'
          type='button'
        >
          ×
        </button>
      )}
    />
  );
}

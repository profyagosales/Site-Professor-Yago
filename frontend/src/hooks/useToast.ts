import { useUI } from '@/providers/UIProvider';

export function useToast() {
  const { showToast, hideToast, clearToasts } = useUI();

  return {
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    hide: hideToast,
    clear: clearToasts,
  };
}

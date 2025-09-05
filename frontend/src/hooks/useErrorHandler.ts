/**
 * Hook para facilitar o tratamento de erros em componentes
 *
 * Funcionalidades:
 * - Tratamento automático de erros de API
 * - Toasts padronizados
 * - Logging consistente
 * - Fallbacks para erros não mapeados
 */

import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import {
  getErrorInfo,
  getNetworkErrorInfo,
  getValidationErrorInfo,
  getUploadErrorInfo,
  shouldLogError,
  shouldShowToast,
  getToastType,
  formatErrorForLogging,
  DEFAULT_ERROR_MAP_CONFIG,
} from '@/services/errorMap';
import { logger } from '@/lib/logger';

export interface UseErrorHandlerOptions {
  // Se deve mostrar toasts automaticamente
  showToasts?: boolean;
  // Se deve logar erros automaticamente
  logErrors?: boolean;
  // Configuração personalizada do error map
  errorMapConfig?: typeof DEFAULT_ERROR_MAP_CONFIG;
  // Callback personalizado para erros
  onError?: (error: any, context?: string) => void;
}

export interface UseErrorHandlerReturn {
  // Trata erro de API
  handleApiError: (error: any, context?: string) => void;
  // Trata erro de validação
  handleValidationError: (field: string, message: string) => void;
  // Trata erro de upload
  handleUploadError: (error: any) => void;
  // Trata erro genérico
  handleGenericError: (error: any, context?: string) => void;
  // Mostra toast personalizado
  showToast: (
    message: string,
    type?: 'error' | 'warning' | 'info' | 'success'
  ) => void;
  // Limpa todos os toasts
  clearToasts: () => void;
}

export function useErrorHandler(
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const {
    showToasts = true,
    logErrors = true,
    errorMapConfig = DEFAULT_ERROR_MAP_CONFIG,
    onError,
  } = options;

  const handleApiError = useCallback(
    (error: any, context?: string) => {
      // Se o erro já foi processado pelo interceptor, usa as informações
      if (error.userMessage) {
        if (showToasts && error.shouldShowToast) {
          const toastType = error.errorType || 'error';
          if (toastType === 'error') {
            toast.error(error.userMessage);
          } else if (toastType === 'warning') {
            toast.warning(error.userMessage);
          } else {
            toast.info(error.userMessage);
          }
        }

        if (onError) {
          onError(error, context);
        }
        return;
      }

      // Processa erro não tratado
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const url = axiosError.config?.url;
      const method = axiosError.config?.method?.toUpperCase();

      let errorInfo;
      if (status) {
        errorInfo = getErrorInfo(status, url, errorMapConfig);
      } else if (
        axiosError.code === 'ECONNABORTED' ||
        axiosError.message?.includes('timeout')
      ) {
        errorInfo = getNetworkErrorInfo('TIMEOUT');
      } else if (
        axiosError.code === 'ERR_NETWORK' ||
        axiosError.message?.includes('Network Error')
      ) {
        errorInfo = getNetworkErrorInfo('NETWORK_ERROR');
      } else if (
        axiosError.code === 'ERR_CANCELED' ||
        axiosError.message?.includes('cancelled')
      ) {
        errorInfo = getNetworkErrorInfo('CANCELED');
      } else {
        errorInfo = getNetworkErrorInfo('UNKNOWN');
      }

      // Log do erro
      if (logErrors && shouldLogError(status || 0, errorMapConfig)) {
        const logMessage = formatErrorForLogging(axiosError, url, method);
        const contextInfo = context ? ` [${context}]` : '';

        if (errorInfo.logLevel === 'error') {
          logger.error(`API Error${contextInfo}`, {
            action: 'api',
            method,
            url,
            status,
            error: logMessage,
            userMessage: errorInfo.message,
          });
        } else if (errorInfo.logLevel === 'warn') {
          logger.warn(`API Warning${contextInfo}`, {
            action: 'api',
            method,
            url,
            status,
            error: logMessage,
            userMessage: errorInfo.message,
          });
        } else {
          logger.info(`API Info${contextInfo}`, {
            action: 'api',
            method,
            url,
            status,
            error: logMessage,
            userMessage: errorInfo.message,
          });
        }
      }

      // Mostra toast
      if (
        showToasts &&
        errorInfo.showToast &&
        shouldShowToast(status || 0, errorMapConfig)
      ) {
        const toastType = getToastType(status || 0);

        if (toastType === 'error') {
          toast.error(errorInfo.message);
        } else if (toastType === 'warning') {
          toast.warning(errorInfo.message);
        } else {
          toast.info(errorInfo.message);
        }
      }

      // Callback personalizado
      if (onError) {
        onError(error, context);
      }
    },
    [showToasts, logErrors, errorMapConfig, onError]
  );

  const handleValidationError = useCallback(
    (field: string, message: string) => {
      const errorInfo = getValidationErrorInfo(field, message);

      if (showToasts) {
        toast.error(errorInfo.message);
      }

      if (logErrors) {
        logger.warn('Validation Error', {
          action: 'validation',
          field,
          message,
          userMessage: errorInfo.message,
        });
      }

      if (onError) {
        onError({ field, message }, 'validation');
      }
    },
    [showToasts, logErrors, onError]
  );

  const handleUploadError = useCallback(
    (error: any) => {
      const errorInfo = getUploadErrorInfo(error);

      if (showToasts) {
        toast.error(errorInfo.message);
      }

      if (logErrors) {
        logger.error('Upload Error', {
          action: 'upload',
          error: error.message || error,
          userMessage: errorInfo.message,
        });
      }

      if (onError) {
        onError(error, 'upload');
      }
    },
    [showToasts, logErrors, onError]
  );

  const handleGenericError = useCallback(
    (error: any, context?: string) => {
      const message = error?.message || error?.toString() || 'Erro inesperado';

      if (showToasts) {
        toast.error(message);
      }

      if (logErrors) {
        const contextInfo = context ? ` [${context}]` : '';
        logger.error(`Generic Error${contextInfo}`, {
          action: 'generic',
          error: message,
          originalError: error,
        });
      }

      if (onError) {
        onError(error, context);
      }
    },
    [showToasts, logErrors, onError]
  );

  const showToast = useCallback(
    (
      message: string,
      type: 'error' | 'warning' | 'info' | 'success' = 'info'
    ) => {
      if (type === 'error') {
        toast.error(message);
      } else if (type === 'warning') {
        toast.warning(message);
      } else if (type === 'success') {
        toast.success(message);
      } else {
        toast.info(message);
      }
    },
    []
  );

  const clearToasts = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    handleApiError,
    handleValidationError,
    handleUploadError,
    handleGenericError,
    showToast,
    clearToasts,
  };
}

// Hook para tratamento de erros específicos de formulários
export function useFormErrorHandler() {
  const { handleValidationError, handleApiError, showToast } =
    useErrorHandler();

  const handleFormError = useCallback(
    (error: any, field?: string) => {
      if (field && error?.response?.data?.errors?.[field]) {
        // Erro de validação específico de campo
        handleValidationError(field, error.response.data.errors[field]);
      } else if (error?.response?.data?.message) {
        // Mensagem de erro geral do servidor
        showToast(error.response.data.message, 'error');
      } else {
        // Erro genérico
        handleApiError(error, 'form');
      }
    },
    [handleValidationError, handleApiError, showToast]
  );

  return {
    handleFormError,
    handleValidationError,
    handleApiError,
    showToast,
  };
}

// Hook para tratamento de erros de upload
export function useUploadErrorHandler() {
  const { handleUploadError, handleApiError, showToast } = useErrorHandler();

  const handleUploadFormError = useCallback(
    (error: any) => {
      if (
        error?.code &&
        ['FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'UPLOAD_FAILED'].includes(
          error.code
        )
      ) {
        handleUploadError(error);
      } else {
        handleApiError(error, 'upload');
      }
    },
    [handleUploadError, handleApiError]
  );

  return {
    handleUploadFormError,
    handleUploadError,
    handleApiError,
    showToast,
  };
}

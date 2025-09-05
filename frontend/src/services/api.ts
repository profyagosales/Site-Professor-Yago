import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { ROUTES } from '@/routes';
import { getToken, clearSession, isTokenExpired } from '@/auth/token';
import {
  getSessionToken,
  performLogout,
  LOGIN_ROUTES,
} from '@/services/session';
import { logger } from '@/lib/logger';
import { toast } from 'react-toastify';
import {
  getErrorInfo,
  getNetworkErrorInfo,
  shouldLogError,
  shouldShowToast,
  getToastType,
  formatErrorForLogging,
  DEFAULT_ERROR_MAP_CONFIG,
} from '@/services/errorMap';

export const STORAGE_TOKEN_KEY = 'auth_token';

import { API_BASE_URL } from '@/config/api';

const base = API_BASE_URL;

// Cliente API robusto com timeout de 15s
export const api = axios.create({
  baseURL: base,
  timeout: 15000, // 15 segundos de timeout
});

// aplica header Authorization dinamicamente
export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    logger.auth('Auth token set', true, {
      action: 'auth',
      component: 'setAuthToken',
    });
  } else {
    delete api.defaults.headers.common.Authorization;
    logger.auth('Auth token cleared', true, {
      action: 'auth',
      component: 'setAuthToken',
    });
  }
}

/**
 * Helper para cancelamento de requests com AbortController
 * Uso: withAbort(signal)(api.get('/endpoint'))
 */
export function withAbort(signal: AbortSignal) {
  return function <T>(request: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Se o signal já foi abortado, rejeita imediatamente
      if (signal.aborted) {
        reject(new Error('Request cancelled'));
        return;
      }

      // Escuta o abort
      const onAbort = () => {
        reject(new Error('Request cancelled'));
      };

      signal.addEventListener('abort', onAbort, { once: true });

      // Executa a request
      request
        .then(resolve)
        .catch(reject)
        .finally(() => {
          signal.removeEventListener('abort', onAbort);
        });
    });
  };
}

/**
 * Helper para criar requests canceláveis
 * Uso: const controller = new AbortController(); api.getWithAbort('/endpoint', controller.signal)
 */
export const apiWithAbort = {
  get: (url: string, signal: AbortSignal, config?: AxiosRequestConfig) =>
    withAbort(signal)(api.get(url, { ...config, signal })),
  post: (
    url: string,
    data?: any,
    signal?: AbortSignal,
    config?: AxiosRequestConfig
  ) =>
    signal
      ? withAbort(signal)(api.post(url, data, { ...config, signal }))
      : api.post(url, data, config),
  put: (
    url: string,
    data?: any,
    signal?: AbortSignal,
    config?: AxiosRequestConfig
  ) =>
    signal
      ? withAbort(signal)(api.put(url, data, { ...config, signal }))
      : api.put(url, data, config),
  delete: (url: string, signal?: AbortSignal, config?: AxiosRequestConfig) =>
    signal
      ? withAbort(signal)(api.delete(url, { ...config, signal }))
      : api.delete(url, config),
};

export function bootstrapAuthFromStorage() {
  // Tenta usar o novo sistema de sessão primeiro
  const sessionToken = getSessionToken();
  if (sessionToken) {
    setAuthToken(sessionToken);
    logger.auth('Session token loaded from storage', true, {
      action: 'auth',
      component: 'bootstrapAuth',
    });
  } else {
    // Fallback para sistema antigo
    const token = getToken();
    if (token) {
      // Verifica se o token não está expirado antes de aplicar
      if (isTokenExpired(token)) {
        logger.warn('Expired token found in storage, clearing session', {
          action: 'auth',
          component: 'bootstrapAuth',
        });
        clearSession();
      } else {
        setAuthToken(token);
        logger.auth('Legacy token loaded from storage', true, {
          action: 'auth',
          component: 'bootstrapAuth',
        });
      }
    } else {
      logger.info('No token found in storage', {
        action: 'auth',
        component: 'bootstrapAuth',
      });
    }
  }

  // Log da configuração da API
  logger.info('API configuration loaded', {
    action: 'api',
    component: 'bootstrapAuth',
    baseURL: base,
    timeout: api.defaults.timeout,
  });
}

// Interceptor de request para adicionar metadata de retry e logging
api.interceptors.request.use(config => {
  // Adiciona metadata para controle de retry
  if (!config.metadata) {
    config.metadata = { retryCount: 0, startTime: Date.now() };
  }

  // Log da requisição (apenas método, URL e timestamp)
  logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    action: 'api',
    method: config.method?.toUpperCase(),
    url: config.url,
  });

  return config;
});

// Interceptor de response com retry para GET e tratamento de 401
let isRedirecting = false; // Evita múltiplos redirecionamentos

api.interceptors.response.use(
  response => {
    // Log da resposta bem-sucedida
    const config = response.config as AxiosRequestConfig & {
      metadata?: { retryCount: number; startTime: number };
    };
    const duration = config.metadata?.startTime
      ? Date.now() - config.metadata.startTime
      : 0;
    const payloadSize = JSON.stringify(response.data).length;

    logger.api(
      config.method?.toUpperCase() || 'UNKNOWN',
      config.url || 'UNKNOWN',
      response.status,
      duration,
      payloadSize
    );

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & {
      metadata?: { retryCount: number; startTime: number };
    };

    // Log do erro de API
    const duration = config.metadata?.startTime
      ? Date.now() - config.metadata.startTime
      : 0;
    logger.apiError(
      config.method?.toUpperCase() || 'UNKNOWN',
      config.url || 'UNKNOWN',
      error,
      duration
    );

    // Tratamento de 401 - limpa token e redireciona
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;

      logger.authError('Token expired or invalid', error, {
        action: 'api',
        method: config.method?.toUpperCase(),
        url: config.url,
      });

      // Usa o novo sistema de sessão para logout
      performLogout('UNAUTHORIZED');
      return Promise.reject(error);
    }

    // Processa erro com mapa de erros
    const processedError = processApiError(error, config);

    // Retry apenas para GET requests com erros de rede
    if (shouldRetry(error, config)) {
      const retryCount = config.metadata?.retryCount || 0;
      const maxRetries = 2;

      if (retryCount < maxRetries) {
        config.metadata = { retryCount: retryCount + 1 };

        // Backoff: 300ms, 800ms
        const delay = retryCount === 0 ? 300 : 800;

        logger.warn(
          `API retry ${retryCount + 1}/${maxRetries} for ${config.url}`,
          {
            action: 'api',
            method: config.method?.toUpperCase(),
            url: config.url,
            retryCount: retryCount + 1,
            maxRetries,
            delay,
          }
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    return Promise.reject(processedError);
  }
);

/**
 * Processa erro da API usando o mapa de erros
 */
function processApiError(
  error: AxiosError,
  config?: AxiosRequestConfig
): AxiosError {
  const status = error.response?.status;
  const url = config?.url;
  const method = config?.method?.toUpperCase();

  // Determina o tipo de erro
  let errorInfo;
  if (status) {
    // Erro HTTP com status
    errorInfo = getErrorInfo(status, url, DEFAULT_ERROR_MAP_CONFIG);
  } else if (
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout')
  ) {
    // Timeout
    errorInfo = getNetworkErrorInfo('TIMEOUT');
  } else if (
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('Network Error')
  ) {
    // Erro de rede
    errorInfo = getNetworkErrorInfo('NETWORK_ERROR');
  } else if (
    error.code === 'ERR_CANCELED' ||
    error.message?.includes('cancelled')
  ) {
    // Request cancelado
    errorInfo = getNetworkErrorInfo('CANCELED');
  } else {
    // Erro desconhecido
    errorInfo = getNetworkErrorInfo('UNKNOWN');
  }

  // Log do erro se necessário
  if (shouldLogError(status || 0, DEFAULT_ERROR_MAP_CONFIG)) {
    const logMessage = formatErrorForLogging(error, url, method);

    if (errorInfo.logLevel === 'error') {
      logger.error('API Error', {
        action: 'api',
        method,
        url,
        status,
        error: logMessage,
        userMessage: errorInfo.message,
      });
    } else if (errorInfo.logLevel === 'warn') {
      logger.warn('API Warning', {
        action: 'api',
        method,
        url,
        status,
        error: logMessage,
        userMessage: errorInfo.message,
      });
    } else {
      logger.info('API Info', {
        action: 'api',
        method,
        url,
        status,
        error: logMessage,
        userMessage: errorInfo.message,
      });
    }
  }

  // Mostra toast se necessário
  if (
    errorInfo.showToast &&
    shouldShowToast(status || 0, DEFAULT_ERROR_MAP_CONFIG)
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

  // Adiciona informações processadas ao erro
  const processedError = { ...error };
  processedError.userMessage = errorInfo.message;
  processedError.errorType = errorInfo.type;
  processedError.shouldShowToast = errorInfo.showToast;

  return processedError;
}

/**
 * Determina se uma request deve ser retentada
 * Apenas para GET requests com erros de rede (não 4xx)
 */
function shouldRetry(error: AxiosError, config?: AxiosRequestConfig): boolean {
  // Apenas GET requests
  if (config?.method?.toUpperCase() !== 'GET') {
    return false;
  }

  // Não retry em erros 4xx (client errors)
  if (
    error.response?.status &&
    error.response.status >= 400 &&
    error.response.status < 500
  ) {
    return false;
  }

  // Retry em erros de rede (sem response) ou 5xx (server errors)
  return !error.response || error.response.status >= 500;
}

/**
 * Helper padrão para ".then(pickData)" em chamadas Axios.
 * Mantemos assinatura genérica para TS e compat com JS callers.
 */
export const pickData = <T = any>(res: AxiosResponse<T>): T => res.data;

/**
 * (Opcional, mas útil) Helper para ".then(pickOk)" quando payload tem { success, data }.
 * Use somente se já houver chamadas esperando isso.
 */
export const pickOk = <T = any>(
  res: AxiosResponse<{ success?: boolean } & T>
) => res.data;

/**
 * Helper para normalizar valores em arrays
 */
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

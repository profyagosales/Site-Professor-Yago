import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { ROUTES } from '@/routes';
import { getToken, clearSession, isTokenExpired } from '@/auth/token';
import { logger } from '@/lib/logger';

export const STORAGE_TOKEN_KEY = 'auth_token';

const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

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
      logger.auth('Token loaded from storage', true, {
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
    const duration = config.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;
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
    const duration = config.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;
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

      // Limpa sessão (token + timers) automaticamente em caso de 401
      clearSession();
      setAuthToken(undefined);

      // Redireciona conforme o contexto da página
      const currentPath = window.location.pathname;
      let redirectPath = ROUTES.home;

      if (currentPath.startsWith('/aluno')) {
        redirectPath = ROUTES.auth.loginAluno;
      } else if (currentPath.startsWith('/professor')) {
        redirectPath = ROUTES.auth.loginProf;
      }

      logger.info('Redirecting to login after 401', {
        action: 'auth',
        from: currentPath,
        to: redirectPath,
      });

      // Usa replace para evitar voltar à página anterior
      window.location.replace(redirectPath);
      return Promise.reject(error);
    }

    // Retry apenas para GET requests com erros de rede
    if (shouldRetry(error, config)) {
      const retryCount = config.metadata?.retryCount || 0;
      const maxRetries = 2;

      if (retryCount < maxRetries) {
        config.metadata = { retryCount: retryCount + 1 };

        // Backoff: 300ms, 800ms
        const delay = retryCount === 0 ? 300 : 800;

        logger.warn(`API retry ${retryCount + 1}/${maxRetries} for ${config.url}`, {
          action: 'api',
          method: config.method?.toUpperCase(),
          url: config.url,
          retryCount: retryCount + 1,
          maxRetries,
          delay,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

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

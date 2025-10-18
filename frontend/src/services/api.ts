import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/http';

declare module 'axios' {
  interface AxiosRequestConfig {
    meta?: {
      skipAuthRedirect?: boolean;
      noCache?: boolean;
    };
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.method?.toLowerCase() === 'get' && config.meta?.noCache) {
    const headers = (config.headers ?? {}) as Record<string, unknown>;
    headers['Cache-Control'] = 'no-store';
    headers.Pragma = 'no-cache';
    config.headers = headers as any;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (err: AxiosError) => {
    const status = err?.response?.status;
    const cfg = err?.config as (InternalAxiosRequestConfig & { meta?: any }) | undefined;
    if (status === 401 && !cfg?.meta?.skipAuthRedirect && typeof window !== 'undefined') {
      try {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.assign(`/login-professor?next=${next}`);
      } catch {
        /* ignore redirect errors */
      }
    }
    return Promise.reject(err);
  }
);

export { api };
export default api;

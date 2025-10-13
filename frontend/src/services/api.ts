// frontend/src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

function normalizeBase(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

type EnvShape = { VITE_API_BASE_URL?: string };
const env = (import.meta as unknown as { env?: EnvShape }).env;
const apiBase = normalizeBase(env?.VITE_API_BASE_URL ?? null);
const baseURL = apiBase ? `${apiBase}/api` : '/api';

// Permitimos meta flags no config
declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosRequestConfig {
    meta?: {
      skipAuthRedirect?: boolean;
      noCache?: boolean;
    };
  }
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Evita cache nos GET quando meta.noCache for true
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.method?.toLowerCase() === 'get' && config.meta?.noCache) {
    const headers = (config.headers ?? {}) as Record<string, unknown>;
    config.headers = {
      ...headers,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    } as any;
  }
  return config;
});

// Redireciona 401 para login, EXCETO quando pedimos para pular
api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const status = err?.response?.status;
    const cfg = err?.config as (InternalAxiosRequestConfig & { meta?: any }) | undefined;

    if (status === 401 && !cfg?.meta?.skipAuthRedirect) {
      const w = typeof window !== 'undefined' ? window : undefined;
      if (w?.location) {
        try {
          const next = encodeURIComponent(`${w.location.pathname}${w.location.search}`);
          w.location.assign(`/login-professor?next=${next}`);
        } catch {}
      }
    }
    return Promise.reject(err);
  }
);

export default api;

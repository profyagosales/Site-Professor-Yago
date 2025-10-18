import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

function normalizeBase(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.replace(/\s+/g, '').replace(/\/+$/, '');
  if (!trimmed) return null;
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

const { VITE_API_URL, VITE_API_BASE_URL } = import.meta.env;
const resolvedApiUrl = normalizeBase(VITE_API_URL || null) ?? normalizeBase(VITE_API_BASE_URL || null);
const baseURL = resolvedApiUrl || '/api';

declare module 'axios' {
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
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

export function setAuthToken(token?: string): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
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

export default api;

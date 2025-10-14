import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api } from './api';

const baseURL = api.defaults.baseURL || '/api';
const TOKEN_KEY = 'gerencial_token';

export const gerencialApi = axios.create({
  baseURL,
  withCredentials: true,
});

gerencialApi.interceptors.request.use((config: InternalAxiosRequestConfig & { meta?: Record<string, unknown> }) => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as any;
  }
  return config;
});

gerencialApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/gerencial/login') {
        window.location.assign('/gerencial/login');
      }
    }
    return Promise.reject(error);
  }
);

export function storeGerencialToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function readGerencialToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export { TOKEN_KEY as GERENCIAL_TOKEN_KEY };

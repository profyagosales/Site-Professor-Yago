import axios from 'axios';
import type { AxiosResponse } from 'axios';

export const STORAGE_TOKEN_KEY = "auth_token";

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
export const api = axios.create({ baseURL: base });

// aplica header Authorization dinamicamente
export function setAuthToken(token?: string) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function bootstrapAuthFromStorage() {
  const t = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (t) setAuthToken(t);
  if (import.meta.env.DEV) console.log("[API] baseURL:", base);
}

// Interceptor 401 - limpa token e redireciona conforme contexto
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Limpa token automaticamente em caso de 401
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      setAuthToken(undefined);
      
      // Redireciona conforme o contexto da página
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/aluno')) {
        window.location.href = '/login-aluno';
      } else if (currentPath.startsWith('/professor')) {
        window.location.href = '/login-professor';
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Helper padrão para ".then(pickData)" em chamadas Axios.
 * Mantemos assinatura genérica para TS e compat com JS callers.
 */
export const pickData = <T = any>(res: AxiosResponse<T>): T => res.data;

/**
 * (Opcional, mas útil) Helper para ".then(pickOk)" quando payload tem { success, data }.
 * Use somente se já houver chamadas esperando isso.
 */
export const pickOk = <T = any>(res: AxiosResponse<{ success?: boolean } & T>) => res.data;

/**
 * Helper para normalizar valores em arrays
 */
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

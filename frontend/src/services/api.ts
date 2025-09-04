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

// Opcional: interceptor 401 passivo (não redireciona aqui)
api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
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

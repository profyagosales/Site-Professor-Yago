import axios from 'axios';
import type { AxiosResponse } from 'axios';

const raw = import.meta.env.VITE_API_BASE_URL || '';
const baseURL = raw.replace(/\/+$/, ''); // remove trailing slash
if (import.meta.env.DEV) console.log('[API] baseURL:', baseURL);

export const api = axios.create({ baseURL });

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
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

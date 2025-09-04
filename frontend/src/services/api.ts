import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { ROUTES } from '@/routes';
import { getToken, clearSession, isTokenExpired } from '@/auth/token';

export const STORAGE_TOKEN_KEY = "auth_token";

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
export const api = axios.create({ baseURL: base });

// aplica header Authorization dinamicamente
export function setAuthToken(token?: string) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function bootstrapAuthFromStorage() {
  const token = getToken();
  if (token) {
    // Verifica se o token não está expirado antes de aplicar
    if (isTokenExpired(token)) {
      console.warn('Token expirado encontrado no storage, limpando');
      clearSession();
    } else {
      setAuthToken(token);
    }
  }
  if (import.meta.env.DEV) console.log("[API] baseURL:", base);
}

// Interceptor 401 - limpa token e redireciona conforme contexto
let isRedirecting = false; // Evita múltiplos redirecionamentos

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      
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
      
      // Usa replace para evitar voltar à página anterior
      window.location.replace(redirectPath);
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

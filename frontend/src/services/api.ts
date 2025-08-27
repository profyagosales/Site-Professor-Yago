import axios from 'axios';
import { getToken } from '@/utils/auth';

// BaseURL resolution:
// - If VITE_API_BASE_URL is set, use it as-is.
// - Otherwise, default to '/api' so Vercel rewrite (vercel.json) proxies to the backend.
const ENV_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
const DEFAULT_BASE = '/api';
const baseURL = ENV_BASE || DEFAULT_BASE;

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  // Remover Content-Type explícito para permitir que o Axios defina automaticamente
  // (multipart/form-data para FormData, application/json para objetos, etc.)
  if (config.headers) {
    try { delete (config.headers as any)['Content-Type']; } catch {}
  }
  const token = getToken();
  if (token) {
    const hdrs = (config.headers ?? {}) as Record<string, any>;
    hdrs.Authorization = `Bearer ${token}`;
    config.headers = hdrs as any;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      try { localStorage.removeItem('auth_token'); localStorage.removeItem('role'); } catch {}
      if (typeof window !== 'undefined') {
        const here = window.location.pathname;
        if (!/login-professor/.test(here)) window.location.replace('/login-professor');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import { getToken } from '@/utils/auth';

// Garante que a URL base termine com /api
function normalizeBase(url?: string) {
  const base = (url || '').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

const baseURL = normalizeBase((import.meta as any).env?.VITE_API_BASE_URL);

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
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

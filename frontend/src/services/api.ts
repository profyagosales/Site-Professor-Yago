import axios from 'axios';
import { getToken } from '@/utils/auth';

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
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

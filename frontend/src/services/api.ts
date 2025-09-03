import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
console.log('[API] baseURL:', api.defaults.baseURL);

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('auth_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const API_BASE_URL = api.defaults.baseURL || '';

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

export function getAuthToken() {
  try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
}

export function authHeader() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

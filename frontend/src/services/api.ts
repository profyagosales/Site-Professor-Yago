import axios from "axios";

// Centralizar API_BASE_URL
function buildApiBaseUrl() {
  let raw = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  raw = raw.trim();
  
  // fallback seguro
  if (!raw) raw = 'https://api.professoryagosales.com.br/api';
  
  // normalizar para garantir /api no final
  if (!raw.endsWith('/api')) {
    raw = raw.replace(/\/+$/, '') + '/api';
  }
  
  return raw;
}

export const API_BASE_URL = buildApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('auth_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem("auth_token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("auth_token");
    delete api.defaults.headers.common.Authorization;
  }
}

// 401 passivo; o guard decide o que fazer
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

// helper usado pelos services
export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

// helper para pegar token atual
export function getAuthToken() {
  try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
}

// helper para header
export function authHeader() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

console.log('[API] baseURL:', api.defaults.baseURL);

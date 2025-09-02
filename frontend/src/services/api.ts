import axios from "axios";

// Centralizar API_BASE_URL
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'https://api.professoryagosales.com.br/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
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

// reaplica token no boot
(() => {
  const t = localStorage.getItem("auth_token");
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
})();

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

// (temporário) logue uma vez o BASE_URL para ver no Console (remover depois)
if (!window.__API_BASE_LOGGED__) {
  // @ts-expect-error
  window.__API_BASE_LOGGED__ = true;
  console.info("[API] baseURL:", API_BASE_URL);
}

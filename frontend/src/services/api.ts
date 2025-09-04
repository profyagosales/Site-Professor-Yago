import axios from 'axios';

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

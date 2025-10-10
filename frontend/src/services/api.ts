// @ts-nocheck
import axios from 'axios';

function normalizeBase(url?: string | null): string {
  let u = typeof url === 'string' ? url.trim() : '';
  if (!u) u = '/api';
  const trailingSlash = /\/+$/;
  u = u.replace(trailingSlash, '');
  const ensureApi = /\/api$/i;
  if (!ensureApi.test(u)) u = `${u}/api`;
  return u;
}

type EnvShape = { VITE_API_BASE_URL?: string };
const env = (import.meta as unknown as { env?: EnvShape }).env;
const baseURL = normalizeBase(env?.VITE_API_BASE_URL ?? null);
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const w = typeof window !== 'undefined' ? window : undefined;
      if (w?.location) {
        try {
          const next = encodeURIComponent(`${w.location.pathname}${w.location.search}`);
          w.location.assign(`/login-professor?next=${next}`);
        } catch (_) {}
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const Themes = {
  list: (q = '') => api.get('/themes', { params: { q } }).then((r) => r.data),
  create: (name: string) => api.post('/themes', { name }).then((r) => r.data),
};

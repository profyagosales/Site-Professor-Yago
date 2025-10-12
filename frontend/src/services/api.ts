import axios from 'axios';

function normalizeBase(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

type EnvShape = { VITE_API_BASE_URL?: string };
const env = (import.meta as unknown as { env?: EnvShape }).env;
const apiBase = normalizeBase(env?.VITE_API_BASE_URL ?? null);
const baseURL = apiBase ? `${apiBase}/api` : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
      const status = err?.response?.status;
      const url = String(err?.config?.url || '');
      // Deixa o GradeWorkspace decidir o que fazer com 401 do file-token
      if (status === 401 && /\/essays\/[^/]+\/file-token(?:\?|$)/.test(url)) {
        return Promise.reject(err);
      }
      if (status === 401) {
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

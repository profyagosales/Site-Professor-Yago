import { api as coreApi, pickData, toArray } from '@/lib/api';

const rawBase = (import.meta as any)?.env?.VITE_API_BASE_URL ?? (import.meta as any)?.env?.VITE_API_URL ?? '';
const trimmed = String(rawBase || '').replace(/\/$/, '');
const baseURL = trimmed
  ? trimmed.endsWith('/api')
    ? trimmed
    : `${trimmed}/api`
  : '/api';

coreApi.defaults.baseURL = baseURL;

export const api = coreApi;
export { pickData, toArray };
export default api;

export const Themes = {
  list: (q = '') => api.get('/themes', { params: { q } }).then((r) => r.data),
  create: (name: string) => api.post('/themes', { name }).then((r) => r.data),
};

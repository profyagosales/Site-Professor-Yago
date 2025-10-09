import { api, pickData, toArray } from '@/lib/api';

export { api, pickData, toArray };
export default api;

export const Themes = {
  list: (q = '') => api.get('/themes', { params: { q } }).then((r) => r.data),
  create: (name: string) => api.post('/themes', { name }).then((r) => r.data),
};

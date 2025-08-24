import { api, pickData } from '@/lib/api';

export const createVisto = (data) => api.post('/api/caderno', data).then(pickData);

export const updateVisto = (id, presentStudentIds) =>
  api.put(`/api/caderno/${id}`, { presentStudentIds }).then(pickData);

export const getVistos = (classId, term) =>
  api.get(`/api/caderno/${classId}/${term}`).then(pickData);

export const getConfig = (classId) =>
  api.get(`/api/caderno/config/${classId}`).then(pickData);

export const updateConfig = (classId, totals) =>
  api.put(`/api/caderno/config/${classId}`, { totals }).then(pickData);

export default {
  createVisto,
  updateVisto,
  getVistos,
  getConfig,
  updateConfig,
};


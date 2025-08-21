import api, { pickData } from '@/services/api';

export const createVisto = (data) => api.post('/caderno', data).then(pickData);

export const updateVisto = (id, students) =>
  api.put(`/caderno/${id}`, { students }).then(pickData);

export const getVistos = (classId, bimester) =>
  api.get(`/caderno/${classId}/${bimester}`).then(pickData);

export default {
  createVisto,
  updateVisto,
  getVistos,
};


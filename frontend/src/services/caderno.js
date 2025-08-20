import { api } from './api';

export const createVisto = async (data) => {
  const res = await api.post('/caderno', data);
  return res.data;
};

export const updateVisto = async (id, students) => {
  const res = await api.put(`/caderno/${id}`, { students });
  return res.data;
};

export const getVistos = async (classId, bimester) => {
  const res = await api.get(`/caderno/${classId}/${bimester}`);
  return res.data;
};

export default {
  createVisto,
  updateVisto,
  getVistos
};

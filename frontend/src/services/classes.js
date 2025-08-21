import api, { pickData } from '@/services/api';

export const listClasses = (params = {}) =>
  api.get('/classes', { params }).then(pickData);

export const createClass = (data) =>
  api.post('/classes', data).then(pickData);

export const updateClass = (id, data) =>
  api.put(`/classes/${id}`, data).then(pickData);

export const deleteClass = (id) =>
  api.delete(`/classes/${id}`).then(pickData);

export default {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
};


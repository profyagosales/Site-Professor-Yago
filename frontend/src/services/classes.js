import api, { pickData } from '@api';

export const listClasses = () => api.get('/classes').then(pickData);

export const getClassById = (id) => api.get(`/classes/${id}`).then(pickData);

export const createClass = (payload) => api.post('/classes', payload).then(pickData);

export const updateClass = (id, payload) => api.put(`/classes/${id}`, payload).then(pickData);

export const deleteClass = (id) => api.delete(`/classes/${id}`).then(pickData);

export const listStudents = (classId) =>
  api.get(`/classes/${classId}/students`).then(pickData);

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  listStudents,
};

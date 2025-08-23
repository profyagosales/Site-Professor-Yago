import api from '@api';

export const listClasses = () => api.get('/classes');

export const getClassById = (id) => api.get(`/classes/${id}`);

export const createClass = (payload) => api.post('/classes', payload);

export const updateClass = (id, payload) => api.put(`/classes/${id}`, payload);

export const deleteClass = (id) => api.delete(`/classes/${id}`);

export const listStudents = (classId) => api.get(`/classes/${classId}/students`);

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  listStudents,
};

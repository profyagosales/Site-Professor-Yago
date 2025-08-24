import { api, pickData } from '@/lib/api';

export const listClasses = () => api.get('/api/classes').then(pickData);

export const getClassById = (id) => api.get(`/api/classes/${id}`).then(pickData);

const normalizeSchedulePayload = (payload) => ({
  ...payload,
  schedule: Array.isArray(payload.schedule)
    ? payload.schedule
    : payload.schedule
    ? [payload.schedule]
    : [],
});

export const createClass = (payload) =>
  api.post('/api/classes', normalizeSchedulePayload(payload)).then(pickData);

export const updateClass = (id, payload) =>
  api.put(`/api/classes/${id}`, normalizeSchedulePayload(payload)).then(pickData);

export const deleteClass = (id) => api.delete(`/api/classes/${id}`).then(pickData);

export const listStudents = (classId) =>
  api.get(`/api/classes/${classId}/students`).then(pickData);

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  listStudents,
};

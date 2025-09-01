import { api, pickData } from '@/services/api';

export const listClasses = () => api.get('/classes').then(pickData);

export const getClassById = (id) => api.get(`/classes/${id}`).then(pickData);

const normalizeSchedulePayload = (payload) => ({
  ...payload,
  schedule: Array.isArray(payload.schedule)
    ? payload.schedule
    : payload.schedule
    ? [payload.schedule]
    : [],
});

export const createClass = (payload) =>
  api.post('/classes', normalizeSchedulePayload(payload)).then(pickData);

export const updateClass = (id, payload) =>
  api.put(`/classes/${id}`, normalizeSchedulePayload(payload)).then(pickData);

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

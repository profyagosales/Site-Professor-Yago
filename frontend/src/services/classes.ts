import { api, pickData } from '@/lib/api';
import apiService from '@/services/api';

export type TeacherClass = { _id: string; name: string; [key: string]: any };

export async function fetchProfessorClasses(): Promise<TeacherClass[]> {
  try {
    const { data } = await apiService.get('/professor/classes', { withCredentials: true });
    const arr = data?.data || data || [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

const normalizeSchedulePayload = (payload: any) => ({
  ...payload,
  schedule: Array.isArray(payload?.schedule)
    ? payload.schedule
    : payload?.schedule
    ? [payload.schedule]
    : [],
});

export const listClasses = () => api.get('/classes').then(pickData);

export const getClassById = (id: string) => api.get(`/classes/${id}`).then(pickData);

export const createClass = (payload: any) =>
  api.post('/classes', normalizeSchedulePayload(payload)).then(pickData);

export const updateClass = (id: string, payload: any) =>
  api.put(`/classes/${id}`, normalizeSchedulePayload(payload)).then(pickData);

export const deleteClass = (id: string) => api.delete(`/classes/${id}`).then(pickData);

export const joinClassAsTeacher = (id: string) =>
  api.post(`/classes/${id}/join-as-teacher`).then(pickData);

export const listStudents = (classId: string) =>
  api.get(`/classes/${classId}/students`).then(pickData);

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  joinClassAsTeacher,
  listStudents,
};

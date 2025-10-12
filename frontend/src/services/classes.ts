import api, { pickData } from '@/lib/api';

export type ProfessorClass = {
  _id: string;
  id?: string;
  name?: string;
  nome?: string;
  series?: string;
  letter?: string;
  discipline?: string;
  disciplina?: string;
  teachers?: any[];
  [key: string]: any;
};

export async function fetchProfessorClasses(): Promise<ProfessorClass[]> {
  const { data } = await api.get('/professor/classes', { withCredentials: true });
  const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return raw as ProfessorClass[];
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

const classesService = {
  fetchProfessorClasses,
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  joinClassAsTeacher,
  listStudents,
};

export default classesService;

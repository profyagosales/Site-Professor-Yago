import api from '@/services/api';

export type ProfessorClass = {
  _id: string;
  name: string;
  id?: string;
  nome?: string;
  series?: string;
  letter?: string;
  discipline?: string;
  disciplina?: string;
  teachers?: any[];
};

type ClassesResp =
  | { success: true; data: ProfessorClass[] }
  | { success?: boolean; message?: string; data?: ProfessorClass[] };

export async function fetchProfessorClasses(): Promise<ProfessorClass[]> {
  const { data } = await api.get<ClassesResp>('/professor/classes', { withCredentials: true });
  if (Array.isArray((data as any)?.data)) return (data as any).data as ProfessorClass[];
  return [];
}

const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;

const normalizeSchedulePayload = (payload: any) => ({
  ...payload,
  schedule: Array.isArray(payload?.schedule)
    ? payload.schedule
    : payload?.schedule
    ? [payload.schedule]
    : [],
});

// compat: alguns componentes antigos ainda importam listClasses
export async function listClasses() {
  return fetchProfessorClasses();
}

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

export default { fetchProfessorClasses };

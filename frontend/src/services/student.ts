import { api } from '@/lib/api';

export type UpcomingQuery = {
  limit?: number;
  daysAhead?: number;
  skip?: number;
};

export const getStudentProfile = async () => (await api.get('/auth/me')).data;

export const getStudentWeeklySchedule = async (studentId: string) =>
  (await api.get(`/students/${studentId}/schedule`)).data;

export const listStudentUpcomingContents = async (studentId: string, params?: UpcomingQuery) =>
  (await api.get(`/students/${studentId}/contents/upcoming`, { params })).data;

export const listStudentUpcomingExams = async (studentId: string, params?: UpcomingQuery) =>
  (await api.get(`/students/${studentId}/exams/upcoming`, { params })).data;

export const listStudentAnnouncements = async (studentId: string, params?: UpcomingQuery) =>
  (await api.get(`/students/${studentId}/announcements`, { params })).data;

export const getStudentNotebookSummary = async (studentId: string, term: number | string) =>
  (await api.get(`/students/${studentId}/notebook`, { params: { term } })).data;

export const getStudentGrades = async (studentId: string, term: number | string) =>
  (await api.get(`/students/${studentId}/grades`, { params: { term } })).data;

export const listStudentEssays = async (studentId: string) =>
  (await api.get(`/students/${studentId}/essays`)).data;

export const uploadStudentEssay = async (payload: FormData | (FormData & { studentId?: string })) => {
  const studentIdValue = payload instanceof FormData ? payload.get('studentId') : (payload as any).studentId;
  const studentId = studentIdValue ? String(studentIdValue) : null;
  if (!studentId) {
    throw new Error('studentId é obrigatório para enviar a redação.');
  }
  return (await api.post(`/students/${studentId}/essays`, payload)).data;
};

export const listStudentAnswerSheets = async (studentId: string) =>
  (await api.get(`/students/${studentId}/answersheets`)).data;

export default {
  getStudentProfile,
  getStudentWeeklySchedule,
  listStudentUpcomingContents,
  listStudentUpcomingExams,
  listStudentAnnouncements,
  getStudentNotebookSummary,
  getStudentGrades,
  listStudentEssays,
  uploadStudentEssay,
  listStudentAnswerSheets,
};

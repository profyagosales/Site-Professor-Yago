import { api } from '@/lib/api';

export const getStudentProfile = async () => (await api.get('/api/auth/me')).data;

export const getStudentWeeklySchedule = async (studentId) =>
  (await api.get(`/students/${studentId}/schedule`)).data;

export const listStudentUpcomingContents = async (studentId, params) =>
  (await api.get(`/students/${studentId}/contents/upcoming`, { params })).data;

export const listStudentUpcomingExams = async (studentId, params) =>
  (await api.get(`/students/${studentId}/exams/upcoming`, { params })).data;

export const listStudentAnnouncements = async (studentId, params) =>
  (await api.get(`/students/${studentId}/announcements`, { params })).data;

export const getStudentNotebookSummary = async (studentId, term) =>
  (await api.get(`/students/${studentId}/notebook`, { params: { term } })).data;

export const getStudentGrades = async (studentId, term) =>
  (await api.get(`/students/${studentId}/grades`, { params: { term } })).data;

export const listStudentEssays = async (studentId) =>
  (await api.get(`/students/${studentId}/essays`)).data;

export const uploadStudentEssay = async (payload /* FormData */) =>
  (await api.post(`/students/${payload.studentId}/essays`, payload)).data;

export const listStudentAnswerSheets = async (studentId) =>
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
}

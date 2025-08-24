import { api } from '@/lib/api';

export const getStudentProfile = async () => (await api.get('/api/me')).data

export const getStudentWeeklySchedule = async (studentId) =>
  (await api.get(`/api/students/${studentId}/schedule`)).data

export const listStudentUpcomingContents = async (studentId, params) =>
  (await api.get(`/api/students/${studentId}/contents/upcoming`, { params })).data

export const listStudentUpcomingExams = async (studentId, params) =>
  (await api.get(`/api/students/${studentId}/exams/upcoming`, { params })).data

export const listStudentAnnouncements = async (studentId, params) =>
  (await api.get(`/api/students/${studentId}/announcements`, { params })).data

export const getStudentNotebookSummary = async (studentId, term) =>
  (await api.get(`/api/students/${studentId}/notebook`, { params:{ term } })).data

export const getStudentGrades = async (studentId, term) =>
  (await api.get(`/api/students/${studentId}/grades`, { params:{ term } })).data

export const listStudentEssays = async (studentId) =>
  (await api.get(`/api/students/${studentId}/essays`)).data

export const uploadStudentEssay = async (payload /* FormData */) =>
  (await api.post(`/api/students/${payload.studentId}/essays`, payload)).data

export const listStudentAnswerSheets = async (studentId) =>
  (await api.get(`/api/students/${studentId}/answersheets`)).data

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

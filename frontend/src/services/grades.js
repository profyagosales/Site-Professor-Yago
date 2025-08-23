import { api, pickData } from '@/lib/http';

export const getClassMatrix = (classId) =>
  api.get(`/grades/class/${classId}`).then(pickData);

// Alias to getClassMatrix for clarity when only totals are needed
export const getClassTotals = (classId) =>
  api.get(`/grades/class/${classId}`).then(pickData);

export const getStudentGrades = (studentId) =>
  api.get(`/grades/student/${studentId}`).then(pickData);

export const postGrade = (data) => api.post('/grades', data).then(pickData);

export const exportClassPdf = (classId) =>
  api.get(`/grades/class/${classId}/export`, { responseType: 'blob' }).then(pickData);

export const exportStudentPdf = (studentId) =>
  api.get(`/grades/student/${studentId}/export`, { responseType: 'blob' }).then(pickData);

export const sendStudentReport = (studentId) =>
  api.post(`/grades/student/${studentId}/send`).then(pickData);

export default {
  getClassMatrix,
  getClassTotals,
  getStudentGrades,
  postGrade,
  exportClassPdf,
  exportStudentPdf,
  sendStudentReport,
};


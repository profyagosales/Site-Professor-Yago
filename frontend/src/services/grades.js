import api from '@api';

export const getClassMatrix = async (classId) => {
  const [studentsRes, gradesRes] = await Promise.all([
    api.get(`/students?class=${classId}`),
    api.get(`/grades/class/${classId}`)
  ]);
  return { students: studentsRes.data, grades: gradesRes.data };
};

export const getStudentGrades = async (studentId) => {
  const res = await api.get(`/grades/student/${studentId}`);
  return res.data;
};

export const postGrade = async (data) => {
  const res = await api.post('/grades', data);
  return res.data;
};

export const exportClassPdf = async (classId) => {
  const res = await api.get(`/grades/class/${classId}/export`, {
    responseType: 'blob'
  });
  return res.data;
};

export const exportStudentPdf = async (studentId) => {
  const res = await api.get(`/grades/student/${studentId}/export`, {
    responseType: 'blob'
  });
  return res.data;
};

export const sendStudentReport = async (studentId) => {
  const res = await api.post(`/grades/student/${studentId}/send`);
  return res.data;
};

export default {
  getClassMatrix,
  getStudentGrades,
  postGrade,
  exportClassPdf,
  exportStudentPdf,
  sendStudentReport
};

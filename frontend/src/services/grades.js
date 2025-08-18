import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const getClassMatrix = async (classId) => {
  const [studentsRes, gradesRes] = await Promise.all([
    axios.get(`${API_URL}/students?class=${classId}`),
    axios.get(`${API_URL}/grades/class/${classId}`)
  ]);
  return { students: studentsRes.data, grades: gradesRes.data };
};

export const getStudentGrades = async (studentId) => {
  const res = await axios.get(`${API_URL}/grades/student/${studentId}`);
  return res.data;
};

export const postGrade = async (data) => {
  const res = await axios.post(`${API_URL}/grades`, data);
  return res.data;
};

export const exportClassPdf = async (classId) => {
  const res = await axios.get(`${API_URL}/grades/class/${classId}/export`, {
    responseType: 'blob'
  });
  return res.data;
};

export const exportStudentPdf = async (studentId) => {
  const res = await axios.get(`${API_URL}/grades/student/${studentId}/export`, {
    responseType: 'blob'
  });
  return res.data;
};

export const sendStudentReport = async (studentId) => {
  const res = await axios.post(`${API_URL}/grades/student/${studentId}/send`);
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

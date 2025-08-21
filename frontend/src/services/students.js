import api, { pickData } from '@/services/api';

export const listStudents = (params = {}) =>
  api.get('/students', { params }).then(pickData);

export const createStudent = (student) =>
  api.post('/students', student).then(pickData);

export const updateStudent = (id, student) =>
  api.put(`/students/${id}`, student).then(pickData);

export const deleteStudent = (id) =>
  api.delete(`/students/${id}`).then(pickData);

export default {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};


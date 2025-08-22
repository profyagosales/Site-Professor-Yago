import api from '@api';

export async function listStudents(params = {}) {
  const r = await api.get('/students', { params });
  const data = r?.data?.data ?? r?.data;
  return Array.isArray(data) ? data : [];
}

export async function listStudentsByClass(classId) {
  if (!classId) return [];
  return listStudents({ class: classId });
}

export async function createStudent(payload) {
  return (await api.post('/students', payload))?.data?.data ?? {};
}

export async function updateStudent(id, payload) {
  return (await api.put(`/students/${id}`, payload))?.data?.data ?? {};
}

export async function deleteStudent(id) {
  return (await api.delete(`/students/${id}`))?.data;
}

export default {
  listStudents,
  listStudentsByClass,
  createStudent,
  updateStudent,
  deleteStudent,
};

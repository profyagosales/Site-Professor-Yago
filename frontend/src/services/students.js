import { api } from '@api';

export async function listStudents(params = {}) {
  const r = await api.get('/students', { params });
  const data = r?.data?.data ?? r?.data;
  return Array.isArray(data) ? data : [];
}


export async function listStudents(classId) {
  const { data } = await api.get('/students', { params: { classId } });
  return data?.data ?? data;
}

export async function createStudent(payload) {
  const formData = new FormData();
  Object.entries(payload ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  const { data } = await api.post('/students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data ?? data;
}

export async function updateStudent(id, payload) {
  return (await api.put(`/students/${id}`, payload))?.data?.data ?? {};
}

export async function deleteStudent(id) {
  return (await api.delete(`/students/${id}`))?.data;
}

export default {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};

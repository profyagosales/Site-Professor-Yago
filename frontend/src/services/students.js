import { api, toArray } from '@api';

const arrify = (v) => {
  const r = toArray ? toArray(v) : undefined;
  return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
};

export async function listStudents(query = {}) {
  const params = typeof query === 'string'
    ? { classId: query }
    : { ...query };
  if (params.class) {
    params.classId = params.class;
    delete params.class;
  }
  const { data } = await api.get('/students', { params });
  return arrify(data?.data ?? data);
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

import api from '@api';

export const listStudents = (query = {}) => {
  const params =
    typeof query === 'string' ? { classId: query } : { ...query };
  if (params.class) {
    params.classId = params.class;
    delete params.class;
  }
  return api.get('/students', { params });
};

export const createStudent = (classId, student) => {
  const formData = new FormData();
  Object.entries(student ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key === 'rollNumber' ? 'number' : key, value);
    }
  });
  return api.post(`/classes/${classId}/students`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateStudent = (id, payload) =>
  api.put(`/students/${id}`, payload);

export const deleteStudent = (id) => api.delete(`/students/${id}`);

export default {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};

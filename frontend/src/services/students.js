import { api } from '@/services/api';

export async function listStudents(classId) {
  if (!classId) return [];
  const { data } = await api.get(`/classes/${classId}/students`);
  return data;
}

export async function create(classId, payload) {
  const { photoFile, number, name, phone, email, password } = payload;
  let data;
  const config = {};
  if (photoFile) {
    const fd = new FormData();
    fd.append('classId', classId);
    fd.append('number', number);
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('email', email);
    fd.append('password', password);
    fd.append('photo', photoFile);
    data = fd;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  } else {
    data = { number, name, phone, email, password, classId };
  }
  const res = await api.post(`/classes/${classId}/students`, data, config);
  return res.data;
}

export async function update(classId, studentId, payload) {
  const { photoFile, number, name, phone, email, password } = payload || {};
  const config = {};
  let data;
  if (photoFile) {
    const fd = new FormData();
    if (number !== undefined) fd.append('number', String(number));
    if (name !== undefined) fd.append('name', name);
    if (phone !== undefined) fd.append('phone', phone);
    if (email !== undefined) fd.append('email', email);
    if (password) fd.append('password', password);
    fd.append('photo', photoFile);
    data = fd;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  } else {
    data = { number, name, phone, email, password };
  }
  return (await api.put(`/classes/${classId}/students/${studentId}`, data, config))?.data;
}

export async function remove(classId, studentId) {
  return (await api.delete(`/classes/${classId}/students/${studentId}`))?.data;
}

export const list = listStudents;
export default { list: listStudents, listStudents, create, update, remove };

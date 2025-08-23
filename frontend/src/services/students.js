import { api } from '@/lib/api';

export async function listStudents(classId) {
  if (!classId) return [];
  const res = await fetch(api(`/classes/${classId}/students`));
  if (!res.ok) throw new Error('Failed to load students');
  return res.json();
}

export async function create(classId, payload) {
  const { photoFile, number, name, phone, email, password } = payload;
  let body;
  let headers = {};
  if (photoFile) {
    const fd = new FormData();
    fd.append('classId', classId);
    fd.append('number', number);
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('email', email);
    fd.append('password', password);
    fd.append('photo', photoFile);
    body = fd;
  } else {
    body = JSON.stringify({ number, name, phone, email, password, classId });
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(api(`/classes/${classId}/students`), {
    method: 'POST',
    headers,
    body,
  });
  if (!res.ok) {
    throw new Error('Failed to create student');
  }
  return res.json();
}

export const list = listStudents;
export default { list: listStudents, listStudents, create };

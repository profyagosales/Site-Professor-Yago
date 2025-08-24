import { api } from '@/lib/api';

export const getRole = () => localStorage.getItem('role');

export const isAuthed = () => ({
  authed: !!localStorage.getItem('token'),
  role: getRole(),
});

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export const loginTeacher = (data) =>
  api.post('/auth/login-teacher', data).then((r) => r.data);

export async function loginStudent({ email, password }) {
  const { data } = await api.post('/auth/login-student', { email, password });
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

export default {
  getRole,
  isAuthed,
  getCurrentUser,
  loginTeacher,
  loginStudent,
  logout,
};


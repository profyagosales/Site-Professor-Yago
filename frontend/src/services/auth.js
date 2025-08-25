import { api } from '@/lib/api';

export const getRole = () => localStorage.getItem('role');

export const isAuthed = () => ({
  authed: !!localStorage.getItem('auth_token'),
  role: getRole(),
});

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export const loginTeacher = (data) =>
  api.post('/auth/login-teacher', data).then((r) => {
    const token = r?.data?.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return r.data;
  });

export async function loginStudent({ email, password }) {
  const { data } = await api.post('/auth/login-student', { email, password });
  return data;
}

export async function logout() {
  try { await api.post('/auth/logout'); } catch {}
  localStorage.removeItem('auth_token');
  localStorage.removeItem('role');
  delete api.defaults.headers.common['Authorization'];
}

export default {
  getRole,
  isAuthed,
  getCurrentUser,
  loginTeacher,
  loginStudent,
  logout,
};


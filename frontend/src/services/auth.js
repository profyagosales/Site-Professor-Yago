import { api } from '@/lib/api';

export const getRole = () => localStorage.getItem('role');

export const isAuthed = () => ({
  authed: !!getRole(),
  role: getRole(),
});

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export const loginTeacher = async (payload) => {
  const { data } = await api.post('/auth/login-teacher', payload);
  if (data?.success) {
    const t = data?.data?.token;
    if (t) localStorage.setItem('auth_token', t);
    localStorage.setItem('role', 'teacher');
    return data;
  }
  return data;
};

export const loginStudent = async ({ email, password }) => {
  const { data } = await api.post('/auth/login-student', { email, password });
  if (data?.success) {
    const t = data?.data?.token;
    if (t) localStorage.setItem('auth_token', t);
    localStorage.setItem('role', 'student');
    return data;
  }
  return data;
};

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // ignore logout errors (e.g., already logged out)
  }
  localStorage.removeItem('auth_token');
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


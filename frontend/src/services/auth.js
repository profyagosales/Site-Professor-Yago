import api from '@api';

export const getRole = () => localStorage.getItem('role');

export const isAuthed = () => ({
  authed: !!localStorage.getItem('token'),
  role: getRole(),
});

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}


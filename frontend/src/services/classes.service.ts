import { api } from '@/lib/api';

export async function fetchProfessorClasses() {
  const { data } = await api.get('/professor/classes');
  return Array.isArray(data?.data) ? data.data : [];
}

import api from '@/services/api';

export async function fetchProfessorClasses(): Promise<any[]> {
  const { data } = await api.get('/professor/classes');
  return Array.isArray(data?.data) ? data.data : [];
}

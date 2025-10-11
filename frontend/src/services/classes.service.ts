import { api } from '@/lib/api';

export type ClassSummary = Record<string, any>;

export async function fetchClasses(): Promise<ClassSummary[]> {
  const { data } = await api.get('/professor/classes');
  const payload = data?.data ?? data;
  return Array.isArray(payload) ? payload : [];
}

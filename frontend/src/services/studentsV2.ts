import { api } from '@/services/api';
import type { Student } from '@/types/student';

export async function searchStudents(params: { q?: string; classId?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get('/students2', { params });
  return data as { items: any[]; page: number; pageSize: number; total: number };
}

export async function getStudent(id: string) {
  const { data } = await api.get(`/students2/${id}`);
  return data as { student: any; stats: { totalEssays: number; averageScore: number | null } };
}

export async function getStudentEssays(
  id: string,
  params: { status?: 'pending' | 'corrected'; page?: number; pageSize?: number }
) {
  const { data } = await api.get(`/students2/${id}/essays`, { params });
  return data as { items: any[]; page: number; pageSize: number; total: number };
}

export default { searchStudents, getStudent, getStudentEssays };

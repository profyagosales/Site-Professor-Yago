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

const STATUS_SYNONYMS: Record<string, string> = {
  pendente: 'pending',
  pending: 'pending',
  corrigida: 'ready',
  corrigidas: 'ready',
  corrected: 'ready',
  ready: 'ready',
  processando: 'processing',
  processing: 'processing',
  erro: 'failed',
  errored: 'failed',
  failed: 'failed',
};

function normalizeStatus(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  return STATUS_SYNONYMS[raw] ?? raw;
}

export async function getStudentEssays(
  id: string,
  params: { status?: 'pending' | 'ready' | 'processing' | 'failed' | 'corrected'; page?: number; pageSize?: number }
) {
  const { data } = await api.get(`/students2/${id}/essays`, {
    params: {
      ...params,
      status: normalizeStatus(params?.status),
    },
  });
  return data as { items: any[]; page: number; pageSize: number; total: number };
}

export default { searchStudents, getStudent, getStudentEssays };

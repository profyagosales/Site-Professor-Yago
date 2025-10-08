import { api } from '@/lib/api';

// Tipo local (não exportado explicitamente a não ser via Promise return)
export type AgendaItem = {
  type: 'content' | 'evaluation' | 'announcement';
  id: string;
  title?: string;
  date: string; // ISO
  classId?: string;
  className?: string;
  subject?: string;
  weight?: number;       // evaluation only
  message?: string;      // announcement only
  source: 'contents' | 'evaluations' | 'announcements';
};

interface CommonParams { start?: string; days?: number; limit?: number; skip?: number }

function buildQuery(params?: CommonParams) {
  if (!params) return {} as Record<string, any>;
  const { start, days, limit, skip } = params;
  const q: Record<string, any> = {};
  if (start) q.start = start; // backend valida formato
  if (typeof days === 'number') q.days = days; else q.days = 7;
  if (typeof limit === 'number') q.limit = limit; else q.limit = 100;
  if (typeof skip === 'number') q.skip = skip; else q.skip = 0;
  return q;
}

async function handleRequest(url: string, params?: CommonParams): Promise<AgendaItem[]> {
  try {
    const { data } = await api.get(url, { params: buildQuery(params) });
    const payload = data?.data ?? data;
    if (Array.isArray(payload)) return payload as AgendaItem[];
    if (import.meta.env.DEV) console.warn('[agenda.service] Resposta inesperada', payload);
    return [];
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error('Não autorizado a acessar a agenda');
    }
    throw new Error(err?.message || 'Falha ao carregar agenda');
  }
}

export function getTeacherWeekAgenda(teacherId: string, params?: CommonParams): Promise<AgendaItem[]> {
  if (!teacherId) return Promise.resolve([]);
  return handleRequest(`/teachers/${teacherId}/agenda/week`, params);
}

export function getStudentWeekAgenda(studentId: string, params?: CommonParams): Promise<AgendaItem[]> {
  if (!studentId) return Promise.resolve([]);
  return handleRequest(`/students/${studentId}/agenda/week`, params);
}

export default {
  getTeacherWeekAgenda,
  getStudentWeekAgenda,
};

import { api } from '@/lib/api';

export type UpcomingQuery = {
  limit?: number;
  daysAhead?: number;
  skip?: number;
};

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildAgendaWindow(params?: UpcomingQuery) {
  const now = new Date();
  const daysRaw = params?.daysAhead ?? 14;
  const daysAhead = Number.isFinite(daysRaw) ? Math.min(Math.max(Number(daysRaw), 1), 180) : 14;
  const from = formatDateOnly(now);
  const to = formatDateOnly(addDays(now, daysAhead));
  return { from, to };
}

async function safeGet<T>(request: Promise<{ data?: T }>): Promise<T | null> {
  try {
    const response = await request;
    return (response?.data ?? null) as T | null;
  } catch (error: any) {
    if (error?.response?.status === 204) return null;
    throw error;
  }
}

export const getStudentProfile = async () =>
  (await safeGet(api.get('/aluno/me'))) ?? null;

export const getStudentAgenda = async (studentId: string, params?: UpcomingQuery & { from?: string; to?: string }) => {
  const window = params?.from && params?.to
    ? { from: params.from, to: params.to }
    : buildAgendaWindow(params);
  const response = await safeGet(api.get(`/alunos/${studentId}/agenda`, { params: window }));
  return (
    response ?? {
      conteudos: [],
      avaliacoes: [],
    }
  );
};

export const listStudentUpcomingContents = async (studentId: string, params?: UpcomingQuery) => {
  const agenda = await getStudentAgenda(studentId, params);
  const list = agenda.conteudos ?? [];
  const skip = params?.skip ?? 0;
  const limit = params?.limit ?? list.length;
  return list.slice(skip, skip + limit);
};

export const listStudentUpcomingExams = async (studentId: string, params?: UpcomingQuery) => {
  const agenda = await getStudentAgenda(studentId, params);
  const list = agenda.avaliacoes ?? [];
  const skip = params?.skip ?? 0;
  const limit = params?.limit ?? list.length;
  return list.slice(skip, skip + limit);
};

export const listStudentAnnouncements = async (studentId: string, params?: UpcomingQuery) => {
  const limit = params?.limit ?? 10;
  const response = await safeGet(api.get(`/alunos/${studentId}/avisos`, { params: { limit } }));
  if (!response) return [];
  const items = (response as any).avisos ?? response;
  return Array.isArray(items) ? items.slice(0, limit) : [];
};

export const getStudentGrades = async (
  studentId: string,
  term?: number | string,
  year?: number | string,
) => {
  const params: Record<string, any> = {};
  if (term !== undefined && term !== null && term !== '') params.bim = term;
  if (year !== undefined && year !== null && year !== '') params.ano = year;
  const response = await safeGet(api.get(`/alunos/${studentId}/notas`, { params }));
  if (!response) {
    return {
      atividades: [],
      agregados: {
        mediaAtividades: null,
        pontuacaoAcumulada: 0,
        totalAtividades: 0,
        resumoPorBimestre: [],
      },
    };
  }
  return response as any;
};

export const listStudentEssays = async (studentId: string) => {
  const response = await safeGet(api.get(`/alunos/${studentId}/redacoes`));
  if (!response) return [];
  const entries = (response as any).redacoes ?? response;
  return Array.isArray(entries) ? entries : [];
};

export const uploadStudentEssay = async (payload: FormData | (FormData & { studentId?: string })) => {
  const studentIdValue = payload instanceof FormData ? payload.get('studentId') : (payload as any).studentId;
  const studentId = studentIdValue ? String(studentIdValue) : null;
  if (!studentId) {
    throw new Error('studentId é obrigatório para enviar a redação.');
  }
  return (await api.post(`/students/${studentId}/essays`, payload)).data;
};

export const getStudentWeeklySchedule = async (studentId: string) =>
  (await safeGet(api.get(`/students/${studentId}/schedule`))) ?? [];

export const getStudentNotebookSummary = async (studentId: string, term: number | string) =>
  (await safeGet(api.get(`/students/${studentId}/notebook`, { params: { term } }))) ?? {};

export const listStudentAnswerSheets = async (studentId: string) =>
  (await safeGet(api.get(`/students/${studentId}/answersheets`))) ?? [];

export default {
  getStudentProfile,
  getStudentAgenda,
  listStudentUpcomingContents,
  listStudentUpcomingExams,
  listStudentAnnouncements,
  getStudentGrades,
  listStudentEssays,
  uploadStudentEssay,
  getStudentWeeklySchedule,
  getStudentNotebookSummary,
  listStudentAnswerSheets,
};

import { api, pickData } from '@/lib/api';

export type UpcomingQuery = {
  limit?: number;
  daysAhead?: number;
  skip?: number;
};

type Fetcher<T> = () => Promise<T>;

const FALLBACK_STATUSES = new Set([404, 405, 410, 422]);

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

function shouldFallback(error: any): boolean {
  const status = Number(error?.response?.status ?? 0);
  return FALLBACK_STATUSES.has(status);
}

async function withFallback<T>(primary: Fetcher<T>, fallback?: Fetcher<T>): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (fallback && shouldFallback(error)) {
      return fallback();
    }
    throw error;
  }
}

async function requestOrNull<T>(promise: Promise<any>): Promise<T | null> {
  try {
    const response = await promise;
    const data = pickData(response);
    return (data ?? null) as T | null;
  } catch (error: any) {
    if (error?.response?.status === 204) return null;
    throw error;
  }
}

async function requestArrayOrEmpty<T>(promise: Promise<any>): Promise<T[]> {
  const data = await requestOrNull<T[]>(promise);
  return Array.isArray(data) ? data : [];
}

function cloneFormData(form: FormData): FormData {
  const copy = new FormData();
  form.forEach((value, key) => {
    const canUseFile = typeof File !== 'undefined' && value instanceof File;
    if (canUseFile) {
      copy.append(key, value, value.name);
      return;
    }
    const canUseBlob = typeof Blob !== 'undefined' && value instanceof Blob;
    if (canUseBlob) {
      const blob = value as Blob & { name?: string };
      copy.append(key, blob, blob.name ?? 'file');
      return;
    }
    copy.append(key, value as string);
  });
  return copy;
}

async function fetchLegacyAgenda(studentId: string, params: Record<string, unknown>) {
  return requestOrNull(api.get(`/alunos/${studentId}/agenda`, { params }));
}

async function fetchLegacyGrades(studentId: string, params: Record<string, unknown>) {
  return requestOrNull(api.get(`/alunos/${studentId}/notas`, { params }));
}

async function fetchLegacyAnnouncements(studentId: string, limit: number) {
  const response = await requestOrNull(api.get(`/alunos/${studentId}/avisos`, { params: { limit } }));
  const items = (response as any)?.avisos ?? response;
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

async function fetchLegacyEssays(studentId: string) {
  const response = await requestOrNull(api.get(`/alunos/${studentId}/redacoes`));
  const entries = (response as any)?.redacoes ?? response;
  return Array.isArray(entries) ? entries : [];
}

function ensureAgenda(payload: any | null) {
  if (payload && typeof payload === 'object') {
    return {
      conteudos: Array.isArray(payload.conteudos) ? payload.conteudos : [],
      avaliacoes: Array.isArray(payload.avaliacoes) ? payload.avaliacoes : [],
    };
  }
  return { conteudos: [], avaliacoes: [] };
}

export const getStudentProfile = async () =>
  withFallback(
    () => requestOrNull<any>(api.get('/students/me')),
    () => requestOrNull<any>(api.get('/aluno/me')),
  );

export const getStudentAgenda = async (studentId: string, params?: UpcomingQuery & { from?: string; to?: string }) => {
  const window = params?.from && params?.to
    ? { from: params.from, to: params.to }
    : buildAgendaWindow(params);
  const payload = await withFallback(
    () => requestOrNull(api.get(`/students/${studentId}/agenda`, { params: window })),
    () => fetchLegacyAgenda(studentId, window),
  );
  return ensureAgenda(payload);
};

export const listStudentUpcomingContents = async (studentId: string, params?: UpcomingQuery) => {
  const limit = params?.limit ?? 8;
  const daysAhead = params?.daysAhead ?? 30;
  const skip = params?.skip ?? 0;

  let modern: any[] | null = null;
  try {
    modern = await requestArrayOrEmpty(api.get(`/students/${studentId}/contents/upcoming`, { params: { limit, daysAhead, skip } }));
  } catch (error) {
    if (!shouldFallback(error)) throw error;
  }

  if (Array.isArray(modern)) return modern;

  const agenda = await getStudentAgenda(studentId, { ...params, daysAhead, limit: limit + skip });
  const list = agenda.conteudos ?? [];
  return list.slice(skip, skip + limit);
};

export const listStudentUpcomingExams = async (studentId: string, params?: UpcomingQuery) => {
  const limit = params?.limit ?? 8;
  const daysAhead = params?.daysAhead ?? 60;
  const skip = params?.skip ?? 0;

  let modern: any[] | null = null;
  try {
    modern = await requestArrayOrEmpty(api.get(`/students/${studentId}/evaluations/upcoming`, { params: { limit, daysAhead, skip } }));
  } catch (error) {
    if (!shouldFallback(error)) throw error;
  }

  if (Array.isArray(modern)) return modern;

  const agenda = await getStudentAgenda(studentId, { ...params, daysAhead, limit: limit + skip });
  const list = agenda.avaliacoes ?? [];
  return list.slice(skip, skip + limit);
};

export const listStudentAnnouncements = async (studentId: string, params?: UpcomingQuery) => {
  const limit = params?.limit ?? 10;
  return withFallback(
    () => requestArrayOrEmpty(api.get(`/students/${studentId}/announcements`, { params: { limit } })),
    () => fetchLegacyAnnouncements(studentId, limit),
  );
};

export const getStudentGrades = async (
  studentId: string,
  term?: number | string,
  year?: number | string,
) => {
  const quarter = term !== undefined && term !== null && term !== '' ? term : undefined;
  const yearParam = year !== undefined && year !== null && year !== '' ? year : undefined;
  const payload = await withFallback(
    () => requestOrNull(api.get(`/students/${studentId}/grades`, { params: { quarter, year: yearParam } })),
    () => fetchLegacyGrades(studentId, { bim: quarter, ano: yearParam }),
  );

  if (!payload) {
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

  return payload as any;
};

export const getStudentYearSummary = async (studentId: string, year?: number | string) => {
  const yearParam = year !== undefined && year !== null && year !== '' ? year : undefined;
  const summary = await withFallback(
    () => requestOrNull(api.get(`/students/${studentId}/grades/summary`, { params: { year: yearParam } })),
    async () => {
      const legacy = await fetchLegacyGrades(studentId, { ano: yearParam });
      return (legacy as any)?.agregados ?? null;
    },
  );

  if (!summary) {
    return {
      pontuacaoAcumulada: 0,
      mediaAtividades: null,
      totalAtividades: 0,
      resumoPorBimestre: [],
    };
  }

  if (typeof summary === 'object' && 'agregados' in summary) {
    return (summary as any).agregados;
  }

  return {
    pontuacaoAcumulada: Number((summary as any)?.pontuacaoAcumulada ?? 0),
    mediaAtividades: (summary as any)?.mediaAtividades ?? null,
    totalAtividades: Number((summary as any)?.totalAtividades ?? 0),
    resumoPorBimestre: Array.isArray((summary as any)?.resumoPorBimestre)
      ? (summary as any).resumoPorBimestre
      : [],
  };
};

export const listStudentEssays = async (studentId: string) =>
  withFallback(
    () => requestArrayOrEmpty(api.get(`/students/${studentId}/essays`)),
    () => fetchLegacyEssays(studentId),
  );

export const uploadStudentEssay = async (payload: FormData | (FormData & { studentId?: string })) => {
  const studentIdValue = payload instanceof FormData ? payload.get('studentId') : (payload as any).studentId;
  const studentId = studentIdValue ? String(studentIdValue) : null;
  if (!studentId) {
    throw new Error('studentId é obrigatório para enviar a redação.');
  }

  const formData = payload instanceof FormData ? payload : (payload as FormData);

  const submit = async (path: string) => {
    const response = await api.post(path, cloneFormData(formData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return pickData(response) ?? response.data;
  };

  return withFallback(
    () => submit('/essays'),
    () => submit(`/students/${studentId}/essays`),
  );
};

export const updateStudentEssay = async (essayId: string, payload: FormData | (FormData & { studentId?: string })) => {
  if (!essayId) {
    throw new Error('essayId é obrigatório para atualizar a redação.');
  }
  const studentIdValue = payload instanceof FormData ? payload.get('studentId') : (payload as any).studentId;
  const studentId = studentIdValue ? String(studentIdValue) : null;
  const formData = payload instanceof FormData ? payload : (payload as FormData);

  const submit = async (path: string) => {
    const response = await api.put(path, cloneFormData(formData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return pickData(response) ?? response.data;
  };

  const primary = () => submit(`/essays/${essayId}`);
  const fallback = studentId ? () => submit(`/students/${studentId}/essays/${essayId}`) : undefined;
  return withFallback(primary, fallback);
};

export const deleteStudentEssay = async (essayId: string, options?: { studentId?: string }) => {
  if (!essayId) {
    throw new Error('essayId é obrigatório para excluir a redação.');
  }
  const studentId = options?.studentId;

  const destroy = async (path: string) => {
    const response = await api.delete(path);
    return pickData(response) ?? response.data ?? true;
  };

  const primary = () => destroy(`/essays/${essayId}`);
  const fallback = studentId ? () => destroy(`/students/${studentId}/essays/${essayId}`) : undefined;
  return withFallback(primary, fallback);
};

export const getStudentWeeklySchedule = async (studentId: string) =>
  (await requestArrayOrEmpty(api.get(`/students/${studentId}/schedule`))) ?? [];

export const getStudentNotebookSummary = async (studentId: string, term: number | string) =>
  (await requestOrNull(api.get(`/students/${studentId}/notebook`, { params: { term } }))) ?? {};

export const listStudentAnswerSheets = async (studentId: string) =>
  requestArrayOrEmpty(api.get(`/students/${studentId}/answersheets`));

export default {
  getStudentProfile,
  getStudentAgenda,
  listStudentUpcomingContents,
  listStudentUpcomingExams,
  listStudentAnnouncements,
  getStudentGrades,
  getStudentYearSummary,
  listStudentEssays,
  uploadStudentEssay,
  updateStudentEssay,
  deleteStudentEssay,
  getStudentWeeklySchedule,
  getStudentNotebookSummary,
  listStudentAnswerSheets,
};

// frontend/src/services/essays.service.ts
import api from '@/services/api';
import type { Anno } from '@/types/annotations';
import type { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';

type EssayId = string;

type FetchEssaysParams = {
  status: EssayStatus;
  page?: number;
  pageSize?: number;
  q?: string;
  classId?: string;
  bimester?: string;
  type?: string;
};

type FetchEssaysPageParams = {
  status?: EssayStatus;
  page?: number;
  limit?: number;
  q?: string;
  classId?: string;
  bimester?: string;
  type?: string;
};

export type StudentEssayStatus = 'PENDING' | 'GRADED';

export type StudentEssaySummary = {
  id: string;
  status: StudentEssayStatus;
  theme: string;
  type?: 'ENEM' | 'PAS' | string;
  submittedAt: string;
  updatedAt?: string;
  bimester?: number;
  rawScore?: number | null;
  scaledScore?: number | null;
  bimestralComputedScore?: number | null;
  bimestreWeight?: number | null;
  correctedFileAvailable: boolean;
};

type ListStudentEssaysOptions = {
  studentId: string;
  status: StudentEssayStatus;
  classId?: string;
  page?: number;
  limit?: number;
};

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.id === 'string') return value.id;
    if (typeof value._id === 'string') return value._id;
  }
  return String(value);
}

function normalizeEssayStatus(value: unknown): StudentEssayStatus {
  if (typeof value !== 'string') return 'PENDING';
  const upper = value.trim().toUpperCase();
  if (upper === 'GRADED' || upper === 'CORRECTED') return 'GRADED';
  return 'PENDING';
}

function formatIso(value: unknown): string {
  if (typeof value === 'string' && value) return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function toStudentEssaySummary(raw: any): StudentEssaySummary {
  const themeName =
    typeof raw?.customTheme === 'string' && raw.customTheme.trim()
      ? raw.customTheme.trim()
      : typeof raw?.themeId?.name === 'string' && raw.themeId.name.trim()
        ? raw.themeId.name.trim()
        : 'Tema não informado';

  const submittedAtSource = raw?.submittedAt ?? raw?.createdAt ?? raw?.updatedAt;
  const updatedAtSource = raw?.updatedAt;

  const bimesterNumber = raw?.bimester != null ? Number(raw.bimester) : undefined;

  const submittedAt = formatIso(submittedAtSource);
  const updatedAt = updatedAtSource ? formatIso(updatedAtSource) : undefined;

  return {
    id: normalizeId(raw),
    status: normalizeEssayStatus(raw?.status),
    theme: themeName,
    type: typeof raw?.type === 'string' ? raw.type : undefined,
    submittedAt,
    updatedAt,
    bimester: Number.isFinite(bimesterNumber) ? (bimesterNumber as number) : undefined,
    rawScore: typeof raw?.rawScore === 'number' ? raw.rawScore : undefined,
    scaledScore: typeof raw?.scaledScore === 'number' ? raw.scaledScore : undefined,
    bimestralComputedScore:
      typeof raw?.bimestralComputedScore === 'number' ? raw.bimestralComputedScore : undefined,
    bimestreWeight: typeof raw?.bimestreWeight === 'number' ? raw.bimestreWeight : undefined,
    correctedFileAvailable: Boolean(raw?.correctedUrl),
  };
}

type GradeEssayPayload = {
  essayType: 'ENEM' | 'PAS';
  weight: number;
  annul?: boolean;
  annulmentReason?: string | null;
  annulReason?: string | null;
  comments?: string;
  enemCompetencies?: { c1?: number; c2?: number; c3?: number; c4?: number; c5?: number };
  pas?: { NC?: number; NL?: number };
  countInBimestral?: boolean;
  bimestralPointsValue?: number;
  sendEmail?: boolean;
};

/** -------- base helpers (sem hardcode de localhost) -------- */
export function normalizeApiOrigin(origin?: string): string {
  const env = (import.meta as any)?.env || {};
  let base = (origin || env?.VITE_API_BASE_URL || '').trim();
  if (!base) base = typeof window !== 'undefined' ? `${window.location.origin}` : '';
  base = base.replace(/\/+$/, '');
  if (!/\/api$/i.test(base)) base += '/api';
  return base;
}

export function buildEssayFileUrl(essayId: string, token: string, origin?: string): string {
  const u = new URL(`/essays/${essayId}/file`, normalizeApiOrigin(origin));
  u.searchParams.set('file-token', token);
  return u.toString();
}

/** -------- short token + PDF helpers -------- */
export async function getFileToken(essayId: string, options?: { signal?: AbortSignal }): Promise<string> {
  const { data } = await api.post(`/essays/${essayId}/file-token`, undefined, { signal: options?.signal });
  return data?.token;
}

export async function prepareEssayFileToken(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
) {
  const token = await getFileToken(essayId, { signal: options?.signal });
  return buildEssayFileUrl(essayId, token, options?.apiOrigin);
}

export async function fetchEssayPdfUrl(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
): Promise<string> {
  const preparedUrl = await prepareEssayFileToken(essayId, options);
  const res = await fetch(preparedUrl, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    signal: options?.signal,
    redirect: 'follow',
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** -------- essays CRUD/list -------- */
export async function fetchEssays(params: FetchEssaysParams): Promise<EssaysPage> {
  const {
    status,
    page = 1,
    pageSize = 10,
    q,
    classId,
    bimester,
    type,
  } = params;

  const { data } = await api.get('/essays', {
    params: {
      status,
      page,
      limit: pageSize,
      q,
      classId,
      bimester,
      type,
    },
  });

  return data;
}

export async function fetchEssaysPage(params: FetchEssaysPageParams): Promise<EssaysPage> {
  const { data } = await api.get('/essays', { params });
  return data;
}

export async function listStudentEssaysByStatus(
  options: ListStudentEssaysOptions
): Promise<StudentEssaySummary[]> {
  if (!options.studentId) {
    return [];
  }

  const params: Record<string, unknown> = {
    studentId: options.studentId,
    status: options.status,
    page: options.page ?? 1,
    limit: options.limit ?? 50,
  };

  if (options.classId) {
    params.classId = options.classId;
  }

  const res = await api.get('/essays', {
    params,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const message = res?.data?.message || 'Erro ao carregar redações do aluno';
    throw new Error(message);
  }

  const payload = res?.data;
  const rawItems: any[] = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];
  return rawItems.map((item) => toStudentEssaySummary(item));
}

export async function fetchEssayById(id: EssayId, options?: { signal?: AbortSignal }) {
  const { data } = await api.get(`/essays/${id}`, { signal: options?.signal });
  return data;
}

export async function getSubmission(id: EssayId, options?: { signal?: AbortSignal }) {
  return fetchEssayById(id, options);
}

export async function createEssay(form: FormData) {
  const { data } = await api.post('/essays', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export async function updateEssay(id: string, form: FormData) {
  const { data } = await api.put(`/essays/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

/** -------- notas/correção -------- */
export async function gradeEssay(id: EssayId, payload: GradeEssayPayload) {
  const body: Record<string, any> = {
    bimestreWeight: payload.weight,
  };

  if (payload.comments !== undefined) body.comments = payload.comments;
  if (payload.countInBimestral !== undefined) body.countInBimestral = payload.countInBimestral;
  if (payload.bimestralPointsValue !== undefined) body.bimestralPointsValue = payload.bimestralPointsValue;
  if (payload.sendEmail !== undefined) body.sendEmail = payload.sendEmail;

  const annulReason = (payload.annulmentReason ?? payload.annulReason)?.toString().trim();
  if (payload.annul || annulReason) {
    body.annulmentReason = annulReason || 'annulled';
  }

  if (!body.annulmentReason) {
    if (payload.essayType === 'ENEM') {
      body.enemCompetencies = {
        c1: payload.enemCompetencies?.c1 ?? 0,
        c2: payload.enemCompetencies?.c2 ?? 0,
        c3: payload.enemCompetencies?.c3 ?? 0,
        c4: payload.enemCompetencies?.c4 ?? 0,
        c5: payload.enemCompetencies?.c5 ?? 0,
      };
    } else if (payload.essayType === 'PAS') {
      body.pasBreakdown = {
        NC: payload.pas?.NC,
        NL: payload.pas?.NL,
      };
    }
  }

  const { data } = await api.patch(`/essays/${id}/grade`, body);
  return data;
}

export async function renderCorrection(id: string, payload?: any) {
  const { data } = await api.post(`/essays/${id}/render-correction`, payload || {});
  return data;
}

export async function sendCorrectionEmail(id: EssayId) {
  const { data } = await api.post(`/essays/${id}/send-email`);
  return data;
}

/** -------- anotações --------
 * IMPORTANTÍSSIMO: SEM localhost, SEM /redacoes – tudo via axios `api` com cookies. */
export async function saveAnnotations(
  id: string,
  annotations: Annotation[],
  opts?: { annos?: Anno[] }
) {
  const body: any = { annotations };
  if (opts?.annos && (window as any).YS_USE_RICH_ANNOS) {
    body.richAnnotations = opts.annos;
  }
  const { data } = await api.put(`/essays/${id}/annotations`, body);
  return data;
}

/** Mantemos o nome para quem ainda importa `updateEssayAnnotations`,
 * mas agora é só um PATCH pelo mesmo client axios (com credenciais).
 * Nada de `http://localhost:5050`. */
export async function updateEssayAnnotations(
  id: string,
  payload: { richAnnotations?: Anno[]; rich?: Anno[] }
) {
  const body: any = {};
  if (Array.isArray(payload.richAnnotations)) body.richAnnotations = payload.richAnnotations;
  else if (Array.isArray(payload.rich)) body.richAnnotations = payload.rich;
  else body.richAnnotations = [];

  const { data } = await api.patch(`/essays/${id}/annotations`, body);
  return data;
}

/** -------- util compat (ainda usado em alguns pontos do UI) -------- */
export async function fetchThemes(params?: { type?: 'ENEM' | 'PAS'; active?: boolean }) {
  const res = await api.get('/essays/themes', { params });
  return res.data;
}

export async function createThemeApi(payload: { name: string; type: 'ENEM' | 'PAS' }) {
  const res = await api.post('/essays/themes', payload);
  return res.data;
}

export async function updateThemeApi(
  id: string,
  payload: { name?: string; type?: 'ENEM' | 'PAS'; active?: boolean }
) {
  const res = await api.patch(`/essays/themes/${id}`, payload);
  return res.data;
}

/** -------- compat helpers for file token + peek -------- */
export async function issueFileToken(essayId: EssayId, options?: { signal?: AbortSignal }) {
  return getFileToken(essayId, options);
}

export async function peekEssayFile(
  essayId: EssayId,
  options: { token: string; signal?: AbortSignal }
): Promise<{ url: string; contentType?: string; contentLength?: number }> {
  const url = buildEssayFileUrl(essayId, options.token);
  const res = await api.head(`/essays/${essayId}/file`, {
    params: { 'file-token': options.token },
    signal: options.signal,
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const headers = res?.headers || {};
  const contentType = headers['content-type'];
  const lengthValue = headers['content-length'];
  const parsedLength = typeof lengthValue === 'string' ? Number(lengthValue) : undefined;
  return {
    url,
    contentType,
    contentLength: parsedLength && !Number.isNaN(parsedLength) ? parsedLength : undefined,
  };
}

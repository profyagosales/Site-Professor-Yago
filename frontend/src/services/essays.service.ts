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

export function joinApi(base: string, path: string) {
  const cleanedBase = typeof base === 'string' ? base.trim() : '';
  const cleanedPath = typeof path === 'string' ? path.replace(/^\/+/, '') : '';
  const normalizedBase = cleanedBase.endsWith('/') ? cleanedBase : `${cleanedBase}/`;
  return new URL(cleanedPath, normalizedBase).toString();
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

type EssayListItem = {
  id: string;
  studentName: string;
  student?: any;
  className: string | null;
  classId?: string | null;
  theme: string;
  type?: string | null;
  bimester?: number | null;
  submittedAt: string | null;
  sentAt: string | null;
  fileUrl?: string | null;
  correctedUrl?: string | null;
  score?: number | null;
  comments?: string | null;
  raw?: any;
};

function normalizeEssayListItem(raw: any): EssayListItem {
  const id = normalizeId(raw);
  const studentName = raw?.studentName || raw?.student?.name || raw?.student || '-';
  const className = raw?.className || raw?.class?.name || raw?.class || null;
  const classId = normalizeId(raw?.classId || raw?.class);
  const theme = raw?.theme || raw?.topic || raw?.title || 'Tema não informado';
  const type = typeof raw?.type === 'string' ? raw.type : typeof raw?.model === 'string' ? raw.model : null;
  const bimester = raw?.term ?? raw?.bimester ?? raw?.bimestre ?? null;
  const sentAt = raw?.sentAt || raw?.submittedAt || raw?.createdAt || null;
  const fileUrl = raw?.fileUrl || raw?.originalUrl || null;
  const correctedUrl = raw?.correctedUrl || null;
  const score = raw?.rawScore ?? raw?.score ?? null;
  const comments = raw?.comments ?? null;

  return {
    id,
    studentName,
    student: raw?.student,
    className,
    classId,
    theme,
    topic: theme,
    type,
    bimester: typeof bimester === 'number' && Number.isFinite(bimester) ? bimester : null,
    submittedAt: sentAt ? new Date(sentAt).toISOString() : null,
    sentAt: sentAt ? new Date(sentAt).toISOString() : null,
    fileUrl,
    correctedUrl,
    score: typeof score === 'number' ? score : null,
    comments: typeof comments === 'string' ? comments : null,
    raw,
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
  const axiosBase = typeof api?.defaults?.baseURL === 'string' ? api.defaults.baseURL.trim() : '';
  const env = (import.meta as any)?.env || {};
  let base = '';
  if (typeof origin === 'string' && origin.trim()) {
    base = origin.trim();
  } else if (axiosBase) {
    base = axiosBase;
  } else if (typeof env?.VITE_API_BASE_URL === 'string' && env.VITE_API_BASE_URL.trim()) {
    base = env.VITE_API_BASE_URL.trim();
  } else if (typeof window !== 'undefined') {
    base = `${window.location.origin}`;
  }

  if (!base) {
    base = '/api';
  }

  base = base.replace(/\/+$/, '');
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`;
  }

  if (!/^https?:\/\//i.test(base)) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`;
    }
    return `http://localhost${base.startsWith('/') ? base : `/${base}`}`;
  }
  return base;
}

function resolveApiBase(explicit?: string) {
  const fallbackOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost';

  const candidate =
    (typeof explicit === 'string' && explicit.trim()) ||
    (typeof api?.defaults?.baseURL === 'string' && api.defaults.baseURL) ||
    '';

  if (!candidate) {
    return `${fallbackOrigin.replace(/\/+$/, '')}/api`;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  const prefixed = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return `${fallbackOrigin.replace(/\/+$/, '')}${prefixed}`;
}

export function buildEssayPdfUrl(
  essayId: string,
  token: string,
  options?: { baseUrl?: string }
): string {
  const base = resolveApiBase(options?.baseUrl);
  const query = `essays/${essayId}/pdf?file-token=${encodeURIComponent(token)}`;
  return joinApi(base, query);
}

/** -------- short token + PDF helpers -------- */
export async function getFileToken(essayId: string, options?: { signal?: AbortSignal }): Promise<string> {
  const { data } = await api.post(
    `/essays/${essayId}/file-token`,
    undefined,
    { signal: options?.signal, meta: { skipAuthRedirect: true } }
  );
  return data?.token;
}

export async function prepareEssayFileToken(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
) {
  const token = await getFileToken(essayId, { signal: options?.signal });
  return buildEssayPdfUrl(essayId, token, { baseUrl: options?.apiOrigin });
}

export async function fetchEssayPdfUrl(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
): Promise<string> {
  const token = await getFileToken(essayId, { signal: options?.signal });
  return buildEssayPdfUrl(essayId, token, { baseUrl: options?.apiOrigin });
}

/** -------- essays CRUD/list -------- */
export async function fetchEssays(params: FetchEssaysParams): Promise<EssaysPage & { items: EssayListItem[] }> {
  const {
    status,
    page = 1,
    pageSize = 10,
    q,
    classId,
    bimester,
    type,
  } = params;

  const statusParam =
    status === 'pending'
      ? 'PENDING'
      : status === 'corrected'
        ? 'GRADED'
        : status;

  const { data } = await api.get('/essays', {
    params: {
      status: statusParam,
      page,
      limit: pageSize,
      q,
      classId,
      bimester,
      type,
    },
  });

  const payload = data && typeof data === 'object' ? data : {};
  const rawItems: any[] = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  const items = rawItems.map((item) => normalizeEssayListItem(item));

  return {
    items,
    page: payload.page ?? page,
    pageSize: payload.limit ?? payload.pageSize ?? pageSize,
    total: payload.total ?? rawItems.length,
  };
}

export async function fetchEssaysPage(params: FetchEssaysPageParams): Promise<EssaysPage & { items: EssayListItem[] }> {
  const mappedParams = {
    ...params,
    status:
      params.status === 'pending'
        ? 'PENDING'
        : params.status === 'corrected'
          ? 'GRADED'
          : params.status,
  };
  const { data } = await api.get('/essays', { params: mappedParams });
  const payload = data && typeof data === 'object' ? data : {};
  const rawItems: any[] = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  const items = rawItems.map((item) => normalizeEssayListItem(item));
  return {
    items,
    page: payload.page ?? params.page ?? 1,
    pageSize: payload.limit ?? payload.pageSize ?? params.limit ?? 10,
    total: payload.total ?? rawItems.length,
  };
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
  const rawItems: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  return rawItems.map((item) => toStudentEssaySummary(item));
}

export async function fetchEssayById(id: EssayId, options?: { signal?: AbortSignal }) {
  const { data } = await api.get(`/essays/${id}`, { signal: options?.signal });
  return data?.data ?? data;
}

export async function getSubmission(id: EssayId, options?: { signal?: AbortSignal }) {
  return fetchEssayById(id, options);
}

export async function createEssay(form: FormData) {
  const { data } = await api.post('/essays', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data?.data ?? data;
}

export async function updateEssay(id: string, form: FormData) {
  const { data } = await api.put(`/essays/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data?.data ?? data;
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
  return data?.data ?? data;
}

export async function renderCorrection(id: string, payload?: any) {
  const { data } = await api.post(`/essays/${id}/render-correction`, payload || {});
  return data?.data ?? data;
}

export async function sendCorrectionEmail(id: EssayId) {
  const { data } = await api.post(`/essays/${id}/send-email`);
  return data?.data ?? data;
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
  return data?.data ?? data;
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
  return data?.data ?? data;
}

/** -------- util compat (ainda usado em alguns pontos do UI) -------- */
export type EssayTheme = {
  id: string;
  title: string;
  type: 'ENEM' | 'PAS';
  description: string | null;
  active: boolean;
  promptFileUrl: string | null;
  promptFilePublicId?: string | null;
};

function normalizeTheme(raw: any): EssayTheme {
  return {
    id: normalizeId(raw),
    title: raw?.title || raw?.name || 'Tema',
    type: (raw?.type || 'PAS') as 'ENEM' | 'PAS',
    description: typeof raw?.description === 'string' ? raw.description : null,
    active: raw?.active !== false,
    promptFileUrl: raw?.promptFileUrl || null,
    promptFilePublicId: raw?.promptFilePublicId || null,
  };
}

export async function fetchThemes(params?: { type?: 'ENEM' | 'PAS'; active?: boolean | 'all' }) {
  const res = await api.get('/essays/themes', { params });
  const payload = res?.data;
  const list: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return list.map((item) => normalizeTheme(item));
}

export async function createThemeApi(payload: { title: string; type: 'ENEM' | 'PAS'; description?: string; file?: File | null }) {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('type', payload.type);
  if (payload.description) form.append('description', payload.description);
  if (payload.file) form.append('file', payload.file);
  const res = await api.post('/essays/themes', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  const data = res?.data?.data ?? res?.data;
  return normalizeTheme(data);
}

export async function updateThemeApi(
  id: string,
  payload: { title?: string; type?: 'ENEM' | 'PAS'; description?: string | null; active?: boolean; file?: File | null }
) {
  let body: any = payload;
  let config: any = {};
  if (payload.file) {
    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.type !== undefined) form.append('type', payload.type);
    if (payload.description !== undefined) form.append('description', payload.description ?? '');
    if (payload.active !== undefined) form.append('active', String(payload.active));
    form.append('file', payload.file);
    body = form;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }
  const res = await api.patch(`/essays/themes/${id}`, body, config);
  const data = res?.data?.data ?? res?.data;
  return normalizeTheme(data);
}

export async function deleteThemeApi(id: string) {
  const res = await api.delete(`/essays/themes/${id}`);
  return res?.data ?? { success: true };
}

export type { EssayListItem };

/** -------- compat helpers for file token + peek -------- */
export async function issueFileToken(essayId: EssayId, options?: { signal?: AbortSignal }) {
  return getFileToken(essayId, options);
}

export async function peekEssayFile(
  essayId: EssayId,
  options: { token: string; signal?: AbortSignal }
): Promise<{ url: string; contentType?: string; contentLength?: number }> {
  const url = buildEssayPdfUrl(essayId, options.token);
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

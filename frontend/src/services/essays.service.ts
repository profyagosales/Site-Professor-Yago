import api from './api';
import { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';
import type { Anno } from '@/types/annotations';

export function normalizeApiOrigin(origin?: string): string {
  const env = (import.meta as any)?.env || {};
  let base = (origin || env?.VITE_API_BASE_URL || '').trim();
  if (!base) base = typeof window !== 'undefined' ? `${window.location.origin}` : '';
  base = base.replace(/\/+$/, '');
  if (!/\/api$/i.test(base)) base += '/api';
  return base;
}

export function getEssayFileUrl(
  essayId: string,
  options?: { token?: string; apiOrigin?: string }
): string {
  const url = new URL(`/essays/${essayId}/file`, normalizeApiOrigin(options?.apiOrigin));
  if (options?.token) url.searchParams.set('file-token', options.token);
  return url.toString();
}

export function buildEssayFileUrl(essayId: string, token: string, origin?: string): string {
  return getEssayFileUrl(essayId, { token, apiOrigin: origin });
}

export async function issueFileToken(
  essayId: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const { data } = await api.post(`/essays/${essayId}/file-token`, undefined, {
    signal: options?.signal,
    meta: { skipAuthRedirect: true },
  });
  return data?.token;
}

export async function getFileToken(
  essayId: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
    try {
      const { data } = await api.get(`/essays/${essayId}/file-token`, {
        signal: options?.signal,
        meta: { skipAuthRedirect: true, noCache: true },
      });
      if (data?.token) return data.token;
    } catch (err) {
      if ((err as any)?.name === 'CanceledError') throw err;
    }
    return issueFileToken(essayId, options);
}

export async function prepareEssayFileToken(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
) {
  const token = await getFileToken(essayId, { signal: options?.signal });
  return { token, url: getEssayFileUrl(essayId, { token, apiOrigin: options?.apiOrigin }) };
}

export async function peekEssayFile(
  essayId: string,
  options?: { token?: string; signal?: AbortSignal; apiOrigin?: string }
) {
  const url = getEssayFileUrl(essayId, {
    token: options?.token,
    apiOrigin: options?.apiOrigin,
  });

  const res = await fetch(url, {
    method: 'HEAD',
    credentials: options?.token ? 'omit' : 'include',
    cache: 'no-store',
    signal: options?.signal,
  });

  if (!res.ok) {
    const error = new Error(`peekEssayFile HTTP ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  const lengthHeader = res.headers.get('content-length');
  const typeHeader = res.headers.get('content-type');
  const contentLength = lengthHeader ? Number(lengthHeader) : undefined;
  const contentType = typeHeader ? typeHeader.split(';')[0] : undefined;

  return {
    url,
    contentLength,
    contentType,
  };
}

export async function fetchEssayPdfUrl(
  essayId: string,
  options?: { signal?: AbortSignal; apiOrigin?: string }
) {
  const { url } = await prepareEssayFileToken(essayId, options);
  try {
    const res = await fetch(url, {
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
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw err;
  }
}

// Themes
export async function fetchThemes(params?: { type?: 'ENEM'|'PAS'; active?: boolean }) {
  const res = await api.get('/essays/themes', { params });
  return res.data;
}

export async function createThemeApi(data: { name: string; type: 'ENEM'|'PAS' }) {
  const res = await api.post('/essays/themes', data);
  return res.data;
}

export async function updateThemeApi(id: string, data: Partial<{ name: string; type: 'ENEM'|'PAS'; active: boolean }>) {
  const res = await api.patch(`/essays/themes/${id}`, data);
  return res.data;
}

export async function fetchEssayById(
  id: string,
  options?: { signal?: AbortSignal }
) {
  // Use compat endpoint which already adapts and populates
  const res = await api.get(`/redacoes/${id}`, {
    signal: options?.signal,
    meta: { skipAuthRedirect: true },
  });
  // Normalize shape a bit
  const d = res.data?.data || res.data;
  return d;
}

export async function getSubmission(id: string, options?: { signal?: AbortSignal }) {
  return fetchEssayById(id, options);
}

export async function fetchEssays(params: {
  status: EssayStatus;
  page?: number;
  pageSize?: number;
  q?: string;
  classId?: string;
  bimester?: string;
  type?: string;
}) {
  const { status, page = 1, pageSize = 10, q, classId, bimester, type } = params;
  try {
    const r = await api.get('/essays', {
      params: {
        status: status === 'pending' ? 'PENDING' : 'GRADED',
        page,
        limit: pageSize,
        q,
        classId,
        bimester,
        type,
      },
    });
    const list: any[] = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
    const items = list.map((e: any) => {
      const studentName = e.student?.name || e.studentName || e.studentId?.name || e.studentId || '-';
      const classObj = e.class || e.classId;
      const className = e.className || (classObj ? `${classObj.series || ''}${classObj.letter || ''}`.trim() : '-');
      return {
        id: e._id || e.id,
        studentName,
        className,
        topic: e.customTheme || e.theme?.name || e.themeName || e.topic || '-',
        submittedAt: e.createdAt || e.submittedAt || new Date().toISOString(),
        fileUrl: e.correctedUrl || e.originalUrl || e.fileUrl || e.file,
        score: e.rawScore ?? e.score,
        comments: e.comments,
        type: e.type,
        bimester: e.bimester,
      };
    });
    const total = r.data?.total ?? items.length;
    return { items, page, pageSize, total } as EssaysPage;
  } catch (err) {
    const legacy = await api.get('/redacoes/professor', {
      params: {
        status: status === 'pending' ? 'pendente' : 'corrigida',
        page,
        limit: pageSize,
        aluno: q,
        turma: classId,
      },
    });
    const list = legacy.data?.redacoes || [];
    const items = list.map((e: any) => ({
      id: e._id || e.id,
      studentName: e.student?.name || '-',
      className: e.class ? `${e.class.series}${e.class.letter}` : '-',
      topic: e.correction?.tema || e.theme || '-',
      submittedAt: e.submittedAt,
      fileUrl: e.correctionPdf || e.correctedUrl || e.file,
      score: e.correction?.finalScore,
      comments: e.correction?.generalComment,
      type: e.type,
    }));
    const total = legacy.data?.total ?? items.length;
    return { items, page, pageSize, total } as EssaysPage;
  }
}

export async function gradeEssay(id: string, payload: {
  essayType: 'ENEM' | 'PAS';
  weight?: number;
  annul?: boolean;
  enemCompetencies?: { c1: number; c2: number; c3: number; c4: number; c5: number };
  pas?: { NC: number; NL: number };
  comments?: string;
  countInBimestral?: boolean;
  bimestralPointsValue?: number;
}) {
  const weight = payload.weight ?? 1;
  const body: any = { bimestreWeight: weight, comments: payload.comments };
  if (payload.countInBimestral !== undefined) body.countInBimestral = payload.countInBimestral;
  if (payload.bimestralPointsValue !== undefined) body.bimestralPointsValue = payload.bimestralPointsValue;
  if (payload.annul) body.annulmentReason = 'IDENTIFICACAO';
  if (payload.essayType === 'ENEM' && payload.enemCompetencies) body.enemCompetencies = payload.enemCompetencies;
  if (payload.essayType === 'PAS' && payload.pas) body.pasBreakdown = { NC: payload.pas.NC, NL: payload.pas.NL };
  try {
    const res = await api.patch(`/essays/${id}/grade`, body);
    return res.data;
  } catch {
    // Fallback compat
    if (payload.essayType === 'PAS' && payload.pas) {
      const res = await api.post(`/redacoes/${id}/corrigir`, {
        tipo: 'PAS',
        nc: payload.pas.NC,
        nl: payload.pas.NL,
        checklist: payload.annul ? { anulada: true } : {},
        comentario: payload.comments,
      });
      return res.data;
    }
    const comps = payload.enemCompetencies || { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
    const res = await api.post(`/redacoes/${id}/corrigir`, {
      tipo: 'ENEM',
      competencias: [
        { pontuacao: comps.c1 },
        { pontuacao: comps.c2 },
        { pontuacao: comps.c3 },
        { pontuacao: comps.c4 },
        { pontuacao: comps.c5 },
      ],
      checklist: payload.annul ? { anulada: true } : {},
      comentario: payload.comments,
    });
    return res.data;
  }
}

export async function saveAnnotations(id: string, annotations: Annotation[], rich?: { annos?: Anno[] }) {
  const body: any = { annotations };
  // behind flag: enviar anotações ricas sem quebrar o contrato existente
  if (rich?.annos && (window as any).YS_USE_RICH_ANNOS) body.richAnnotations = rich.annos;
  const res = await api.put(`/essays/${id}/annotations`, body);
  return res.data;
}

export async function renderCorrection(id: string, opts?: { sendEmail?: boolean; thumbnailsCount?: number }) {
  const res = await api.post(`/essays/${id}/render-correction`, opts || {});
  return res.data;
}

export async function sendCorrectionEmail(id: string) {
  const res = await api.post(`/essays/${id}/send-email`);
  return res.data;
}

// Atualiza anotações ricas da redação
// Aceita payload com `rich` (legado) ou `richAnnotations` e envia o campo esperado pelo backend
export async function updateEssayAnnotations(
  essayId: string,
  payload: { rich?: any[]; richAnnotations?: any[] }
) {
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL || "";
  const body: any = {};
  if (Array.isArray(payload.richAnnotations)) body.richAnnotations = payload.richAnnotations;
  else if (Array.isArray(payload.rich)) body.richAnnotations = payload.rich;
  else body.richAnnotations = [];

  const res = await fetch(`${base}/api/essays/${essayId}/annotations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateEssayAnnotations ${res.status}`);
  return await res.json().catch(() => ({}));
}

export default { fetchEssays, gradeEssay, saveAnnotations, renderCorrection, sendCorrectionEmail };

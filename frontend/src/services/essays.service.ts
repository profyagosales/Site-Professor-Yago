import { api } from './api';
import { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';
import type { Anno } from '@/types/annotations';

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

export async function fetchEssayById(id: string) {
  // Use compat endpoint which already adapts and populates
  const res = await api.get(`/redacoes/${id}`);
  // Normalize shape a bit
  const d = res.data?.data || res.data;
  return d;
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

// Obtém URL curta e segura para o PDF da redação
// Estratégia: tenta emitir JWT curto em /essays/:id/file-token; se 404, cai para URL assinada curta /essays/:id/file-signed
function resolveApiBase() {
  const env = ((import.meta as any) || {}).env || {};
  const raw = env.VITE_API_BASE_URL || env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return String(raw || '').replace(/\/$/, '');
}

function buildEssayFileUrl(id: string, suffix: string) {
  const base = resolveApiBase();
  return `${base}/api/essays/${id}/${suffix}`;
}

function tokenUrl(id: string, token: string) {
  const base = resolveApiBase();
  return `${base}/api/essays/${id}/file?file-token=${encodeURIComponent(token)}`;
}

export async function getEssayFileUrl(essayId: string): Promise<string> {
  try {
    const r = await api.post(`/essays/${essayId}/file-token`);
    const token = r.data?.token || r.data?.accessToken;
    if (token) return tokenUrl(essayId, token);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) throw new Error('Sessão expirada. Faça login novamente.');
    if (status === 403) throw new Error('Sem permissão para ler este arquivo.');
    if (status && status !== 404) throw err;
  }
  try {
    const signed = await api.get(`/essays/${essayId}/file-signed`);
    const url = signed.data?.url || signed.data;
    if (typeof url === 'string' && url) return url;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) throw new Error('Sessão expirada. Faça login novamente.');
    if (status === 403) throw new Error('Sem permissão para ler este arquivo.');
    if (status && status !== 404) throw err;
  }
  // Fallback final: cookie-protected streaming
  return buildEssayFileUrl(essayId, 'file');
}

// Novo service: obtém token ou URL curta via GET (utilizado pelo loader resiliente)
export async function getEssayFileToken(essayId: string): Promise<{ url?: string; token?: string; expiresAt?: string; ttl?: number }> {
  try {
    const r = await api.get(`/essays/${essayId}/file-token`);
    return r.data || {};
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) throw new Error('Sessão expirada. Faça login novamente.');
    if (status === 403) throw new Error('Sem permissão para ler este arquivo.');
    throw new Error('Falha ao obter token do arquivo');
  }
}

// Atualiza anotações ricas da redação
// Aceita payload com `rich` (legado) ou `richAnnotations` e envia o campo esperado pelo backend
export async function updateEssayAnnotations(
  essayId: string,
  payload: { rich?: any[]; richAnnotations?: any[] }
) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
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

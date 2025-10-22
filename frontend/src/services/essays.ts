import { api } from './api';
import { EssaysPage, EssayStatus } from '@/types/redacao';

// Adapter: map our UI params to backend routes
export async function fetchEssays(params: {
  status: EssayStatus;
  page?: number;
  pageSize?: number;
  q?: string;
  classId?: string;
}) {
  // Prefer modern essays endpoints if available; fallback to legacy redacoes
  const { status, page = 1, pageSize = 10, q, classId } = params;
  try {
    const r = await api.get('/essays', {
      params: {
        status: status === 'pending' ? 'PENDING' : 'GRADED',
        page,
        limit: pageSize,
        q,
        classId,
      },
    });
    const list: any[] = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
    const items = list.map((e: any) => ({
      id: e._id || e.id,
      studentName: e.student?.name || e.studentName || e.studentId || '-',
      className: e.class?.name || e.className || `${e.class?.series || ''}${e.class?.letter || ''}`.trim(),
      topic: e.customTheme || e.theme?.name || e.themeName || e.topic || '-',
      submittedAt: e.createdAt || e.submittedAt || new Date().toISOString(),
      fileUrl: e.originalUrl || e.fileUrl || e.file,
      score: e.rawScore ?? e.score,
      comments: e.comments,
    }));
    const total = r.data?.total ?? items.length;
    return { items, page, pageSize, total } as EssaysPage;
  } catch (err) {
    // fallback to legacy
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
      fileUrl: e.correctionPdf || e.file,
      score: e.correction?.finalScore,
      comments: e.correction?.generalComment,
    }));
    const total = legacy.data?.total ?? items.length;
    return { items, page, pageSize, total } as EssaysPage;
  }
}

export async function gradeEssay(id: string, payload: { score: number; comments?: string }) {
  // Try new endpoint: expects form-data or json depending on backend. We'll send json for comments-only grading.
  try {
    const res = await api.patch(`/essays/${id}/grade`, {
      bimestreWeight: 1,
      comments: payload.comments,
      pasBreakdown: { NC: payload.score, NL: 1 },
    });
    return res.data;
  } catch {
    const res = await api.post(`/redacoes/${id}/corrigir`, {
      tipo: 'ENEM',
      competencias: [
        { pontuacao: payload.score },
        { pontuacao: 0 },
        { pontuacao: 0 },
        { pontuacao: 0 },
        { pontuacao: 0 },
      ],
      checklist: {},
      comentario: payload.comments,
    });
    return res.data;
  }
}

export type EssayAnnotationRectPayload = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type EssayAnnotationPayload = {
  id?: string;
  page: number;
  rects: EssayAnnotationRectPayload[];
  color: string;
  category: string;
  comment: string;
  number: number;
};

export async function getAnnotations(essayId: string) {
  const res = await api.get(`/essays/${essayId}/annotations`);
  const payload = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(payload) ? (payload as EssayAnnotationPayload[]) : [];
}

export async function saveAnnotations(essayId: string, annotations: EssayAnnotationPayload[]) {
  const res = await api.post(`/essays/${essayId}/annotations`, { annotations });
  const payload = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(payload) ? (payload as EssayAnnotationPayload[]) : [];
}

export async function deleteAnnotation(essayId: string, annotationId: string) {
  await api.delete(`/essays/${essayId}/annotations/${annotationId}`);
}

export type EssayScorePayload = {
  type: 'PAS' | 'ENEM' | string;
  annulled: boolean;
  reasons?: string[];
  otherReason?: string | null;
  pas?: {
    NC?: number | null;
    NL?: number | null;
    NE?: number | null;
    NR?: number | null;
  };
  enem?: {
    levels?: number[];
    points?: number[];
    total?: number;
  };
};

export async function getEssayScore(essayId: string) {
  const res = await api.get(`/essays/${essayId}/score`);
  return res?.data?.data ?? res?.data ?? null;
}

export async function saveEssayScore(essayId: string, payload: EssayScorePayload) {
  const res = await api.post(`/essays/${essayId}/score`, payload);
  return res?.data?.data ?? res?.data ?? payload;
}

export async function generateCorrectedPdf(essayId: string) {
  const res = await api.post(`/essays/${essayId}/final-pdf`);
  return res?.data?.data ?? res?.data ?? null;
}

export default { fetchEssays, gradeEssay };

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

export default { fetchEssays, gradeEssay };

import { api } from './api';
import { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';
import type { Anno } from '@/types/annotations';

// Themes
export async function fetchThemes(params?: {
  type?: 'ENEM' | 'PAS';
  active?: boolean;
}) {
  const res = await api.get('/essays/themes', { params });
  return res.data;
}

export async function createThemeApi(data: {
  name: string;
  type: 'ENEM' | 'PAS';
}) {
  const res = await api.post('/essays/themes', data);
  return res.data;
}

export async function updateThemeApi(
  id: string,
  data: Partial<{ name: string; type: 'ENEM' | 'PAS'; active: boolean }>
) {
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
  const {
    status,
    page = 1,
    pageSize = 10,
    q,
    classId,
    bimester,
    type,
  } = params;
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
    const list: any[] = Array.isArray(r.data)
      ? r.data
      : r.data?.items || r.data?.data || [];
    const items = list.map((e: any) => {
      const studentName =
        e.student?.name ||
        e.studentName ||
        e.studentId?.name ||
        e.studentId ||
        '-';
      const classObj = e.class || e.classId;
      const className =
        e.className ||
        (classObj
          ? `${classObj.series || ''}${classObj.letter || ''}`.trim()
          : '-');
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
        status: e.status || 'PENDING',
        sentAt: e.sentAt || null,
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

export async function gradeEssay(
  id: string,
  payload: {
    essayType: 'ENEM' | 'PAS';
    weight?: number;
    annul?: boolean;
    enemCompetencies?: {
      c1: number;
      c2: number;
      c3: number;
      c4: number;
      c5: number;
    };
    pas?: { NC: number; NL: number };
    comments?: string;
    countInBimestral?: boolean;
    bimestralPointsValue?: number;
  }
) {
  const weight = payload.weight ?? 1;
  const body: any = { bimestreWeight: weight, comments: payload.comments };
  if (payload.countInBimestral !== undefined)
    body.countInBimestral = payload.countInBimestral;
  if (payload.bimestralPointsValue !== undefined)
    body.bimestralPointsValue = payload.bimestralPointsValue;
  if (payload.annul) body.annulmentReason = 'IDENTIFICACAO';
  if (payload.essayType === 'ENEM' && payload.enemCompetencies)
    body.enemCompetencies = payload.enemCompetencies;
  if (payload.essayType === 'PAS' && payload.pas)
    body.pasBreakdown = { NC: payload.pas.NC, NL: payload.pas.NL };
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
    const comps = payload.enemCompetencies || {
      c1: 0,
      c2: 0,
      c3: 0,
      c4: 0,
      c5: 0,
    };
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

export async function getAnnotations(id: string) {
  const res = await api.get(`/essays/${id}/annotations`);
  return res.data;
}

export async function saveAnnotations(
  id: string,
  annotations: Annotation[],
  rich?: { annos?: Anno[] }
) {
  const body: any = { annotations };
  // behind flag: enviar anotações ricas sem quebrar o contrato existente
  if (rich?.annos && (window as any).YS_USE_RICH_ANNOS)
    body.richAnnotations = rich.annos;

  try {
    const res = await api.put(`/essays/${id}/annotations`, body);
    return res.data;
  } catch (error: any) {
    // Log específico para erros CORS sem travar a UI
    if (
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('CORS') ||
      error.message?.includes('preflight')
    ) {
      console.warn(
        'Erro CORS detectado no saveAnnotations - verificar configuração do servidor:',
        error.message
      );
    } else {
      console.error('Erro ao salvar anotações:', error);
    }
    throw error; // Re-throw para que o componente possa tratar
  }
}

export async function renderCorrection(
  id: string,
  opts?: { sendEmail?: boolean; thumbnailsCount?: number }
) {
  const res = await api.post(`/essays/${id}/render-correction`, opts || {});
  return res.data;
}

export async function sendCorrectionEmail(id: string) {
  try {
    const res = await api.post(`/essays/${id}/send-email`);
    return res.data;
  } catch (error: any) {
    // Tratar erro 409 (redação não corrigida)
    if (error.response?.status === 409) {
      throw new Error(error.response.data.message || 'Apenas redações corrigidas podem ter o e-mail enviado');
    }
    throw error;
  }
}

/**
 * Gera PDF corrigido consolidando anotações e nota final
 * 
 * @param essayId - ID da redação
 * @returns Promise<Blob> - PDF corrigido como blob
 */
export async function generateCorrectedPdf(essayId: string): Promise<Blob> {
  try {
    const response = await api.get(`/essays/${essayId}/corrected`, {
      responseType: 'blob',
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar PDF corrigido:', error);
    throw new Error('Falha ao gerar PDF corrigido');
  }
}

/**
 * Verifica status de geração de PDF corrigido
 * 
 * @param essayId - ID da redação
 * @returns Promise<{ status: 'processing' | 'ready' | 'error', url?: string }>
 */
export async function checkCorrectedPdfStatus(essayId: string): Promise<{
  status: 'processing' | 'ready' | 'error';
  url?: string;
  error?: string;
}> {
  try {
    const response = await api.get(`/essays/${essayId}/corrected/status`);
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar status do PDF:', error);
    return { status: 'error', error: 'Falha ao verificar status' };
  }
}

/**
 * Gera PDF corrigido com polling para status 202
 * 
 * @param essayId - ID da redação
 * @param options - Opções de polling
 * @returns Promise<Blob> - PDF corrigido como blob
 */
export async function generateCorrectedPdfWithPolling(
  essayId: string,
  options: {
    pollInterval?: number; // ms entre verificações (padrão: 2000)
    maxPollTime?: number; // tempo máximo de polling (padrão: 20000)
    onStatusUpdate?: (status: string) => void;
  } = {}
): Promise<Blob> {
  const {
    pollInterval = 2000,
    maxPollTime = 20000,
    onStatusUpdate,
  } = options;

  const startTime = Date.now();
  
  try {
    // Primeira tentativa de gerar PDF
    try {
      const blob = await generateCorrectedPdf(essayId);
      return blob;
    } catch (error: any) {
      // Se retornou 202, inicia polling
      if (error.response?.status === 202) {
        onStatusUpdate?.('Processando PDF...');
        
        // Polling até PDF estar pronto ou timeout
        while (Date.now() - startTime < maxPollTime) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const status = await checkCorrectedPdfStatus(essayId);
          
          if (status.status === 'ready' && status.url) {
            onStatusUpdate?.('PDF pronto!');
            // Baixa o PDF final
            const response = await api.get(status.url, { responseType: 'blob' });
            return response.data;
          } else if (status.status === 'error') {
            throw new Error(status.error || 'Erro ao processar PDF');
          }
          
          onStatusUpdate?.(`Processando PDF... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }
        
        throw new Error('Timeout ao gerar PDF corrigido');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Erro ao gerar PDF corrigido com polling:', error);
    throw error;
  }
}

export default {
  fetchEssays,
  gradeEssay,
  getAnnotations,
  saveAnnotations,
  renderCorrection,
  sendCorrectionEmail,
  generateCorrectedPdf,
  checkCorrectedPdfStatus,
  generateCorrectedPdfWithPolling,
};

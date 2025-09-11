// Services para integração com a API de redações
import api from './api';

// Interface para as anotações
export interface APIAnnotation {
  page: number;
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
  category: string;
  comment: string;
}

// Interface para o conjunto de anotações
export interface AnnotationSet {
  essayId: string;
  highlights: APIAnnotation[];
  comments: { text: string; category: string }[];
}

// Interface para redação
export interface Essay {
  _id: string;
  studentId: string;
  teacherId?: string;
  type: 'ENEM' | 'PAS';
  themeId?: string;
  themeText?: string;
  status: 'PENDING' | 'GRADING' | 'GRADED';
  file: {
    originalUrl: string;
    mime: string;
    size: number;
    pages: number;
  };
  enem?: {
    c1?: number;
    c2?: number;
    c3?: number;
    c4?: number;
    c5?: number;
    rawScore?: number;
  };
  pas?: {
    NC?: number;
    NE?: number;
    NL?: number;
    rawScore?: number;
  };
  annulment?: {
    active: boolean;
    reasons: string[];
  };
  correctedPdfUrl?: string;
  email?: {
    lastSentAt?: Date;
  };
  bimester?: number;
  countInAverage?: boolean;
  grade?: number;
  generalComments?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    _id: string;
    name: string;
    email: string;
    class?: string;
    photoUrl?: string;
  };
  theme?: {
    _id: string;
    title: string;
    description: string;
  };
  teacher?: {
    _id: string;
    name: string;
  };
}

// Interface para resposta paginada
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Serviços relacionados às redações
export const essayService = {
  // Listar redações com filtros
  async getEssays(params: {
    status?: string;
    type?: string;
    themeId?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Essay>> {
    const response = await api.get('/essays', { params });
    return response.data;
  },

  // Obter uma redação por ID
  async getEssayById(id: string): Promise<Essay> {
    const response = await api.get(`/essays/${id}`);
    return response.data;
  },

  // Obter token de acesso ao arquivo PDF
  async getFileToken(id: string): Promise<string> {
    const response = await api.post(`/essays/${id}/file-token`);
    return response.data.token;
  },

  // Construir URL para o arquivo PDF
  getFileUrl(id: string, token: string): string {
    return `${api.defaults.baseURL}/essays/${id}/file?token=${token}`;
  },

  // Obter anotações de uma redação
  async getAnnotations(essayId: string): Promise<AnnotationSet> {
    const response = await api.get(`/essays/${essayId}/annotations`);
    return response.data;
  },

  // Atualizar anotações
  async updateAnnotations(essayId: string, annotations: AnnotationSet): Promise<AnnotationSet> {
    const response = await api.put(`/essays/${essayId}/annotations`, annotations);
    return response.data;
  },

  // Avaliar redação
  async gradeEssay(
    essayId: string, 
    data: {
      type: 'ENEM' | 'PAS';
      enem?: {
        c1?: number;
        c2?: number;
        c3?: number;
        c4?: number;
        c5?: number;
      };
      pas?: {
        NC?: number;
        NE?: number;
        NL?: number;
      };
      annulment?: {
        active: boolean;
        reasons: string[];
      };
      bimester?: number;
      countInAverage?: boolean;
      grade?: number;
      generalComments?: string;
    }
  ): Promise<Essay> {
    const response = await api.put(`/essays/${essayId}/grade`, data);
    return response.data;
  },

  // Exportar PDF corrigido
  async exportCorrectedPdf(essayId: string): Promise<{ url: string }> {
    const response = await api.post(`/essays/${essayId}/export`);
    return response.data;
  },

  // Enviar e-mail com PDF corrigido
  async sendEmailWithPdf(essayId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/essays/${essayId}/send-email`);
    return response.data;
  },
};
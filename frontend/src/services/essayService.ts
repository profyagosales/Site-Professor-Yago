// Services para integração com a API de redações
import api from './api';

// Interface para as anotações
export interface APIAnnotation {
  page: number;
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
  category: string;
  comment: string;
  id?: string; // ID único para a anotação
  number?: number; // Número da anotação para exibição no PDF
}

// Interface para o conjunto de anotações
export interface AnnotationSet {
  essayId: string;
  highlights: APIAnnotation[];
  comments: { text: string; category: string; id?: string }[];
}

// Interface para as categorias de marcação
export interface MarkCategory {
  name: string;
  color: string;
  title: string;
  description?: string;
  isError?: boolean; // Se true, conta como erro para cálculo do NE no PAS
}

// Categorias padrão para marcações
export const DEFAULT_MARK_CATEGORIES: MarkCategory[] = [
  { name: 'grammar', color: '#FF5252', title: 'Erro gramatical', isError: true },
  { name: 'spelling', color: '#FF9800', title: 'Erro ortográfico', isError: true },
  { name: 'highlight', color: '#FFEB3B', title: 'Destaque' },
  { name: 'content', color: '#4CAF50', title: 'Conteúdo correto' },
  { name: 'suggestion', color: '#2196F3', title: 'Sugestão' },
  { name: 'structure', color: '#9C27B0', title: 'Estrutura textual' }
];

// Interface para redação
export interface Essay {
  _id: string;
  studentId: string;
  teacherId?: string;
  type: 'ENEM' | 'PAS';
  themeId?: string;
  themeText?: string;
  status: 'PENDING' | 'GRADING' | 'GRADED' | 'SENT';
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
    description?: string;
  };
  teacher?: {
    _id: string;
    name: string;
    email?: string;
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
    status?: string | string[];
    type?: string;
    themeId?: string;
    q?: string;
    page?: number;
    limit?: number;
    studentId?: string;
    bimester?: number;
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
  
  // Métodos específicos para o professor
  professor: {
    // Listar redações pendentes (para correção)
    async getPendingEssays(params: {
      page?: number;
      limit?: number;
      q?: string; // Busca por nome de aluno ou tema
      type?: 'ENEM' | 'PAS';
      bimester?: number;
    }): Promise<PaginatedResponse<Essay>> {
      const queryParams = {
        ...params,
        status: 'PENDING'
      };
      const response = await api.get('/essays', { params: queryParams });
      return response.data;
    },
    
    // Listar redações já corrigidas
    async getGradedEssays(params: {
      page?: number;
      limit?: number;
      q?: string;
      type?: 'ENEM' | 'PAS';
      bimester?: number;
      sent?: boolean; // Se true, filtra redações já enviadas por e-mail
    }): Promise<PaginatedResponse<Essay>> {
      const queryParams = {
        ...params,
        status: params.sent ? 'SENT' : 'GRADED'
      };
      const response = await api.get('/essays', { params: queryParams });
      return response.data;
    },
  },
  
  // Métodos específicos para o aluno
  student: {
    // Listar minhas redações
    async getMyEssays(params: {
      page?: number;
      limit?: number;
      status?: 'PENDING' | 'GRADED' | 'SENT' | 'ALL';
      type?: 'ENEM' | 'PAS';
      bimester?: number;
    }): Promise<PaginatedResponse<Essay>> {
      const queryParams = {
        ...params,
        // Se status for ALL, não envia o parâmetro status para o backend
        ...(params.status && params.status !== 'ALL' ? { status: params.status } : {})
      };
      const response = await api.get('/essays/my', { params: queryParams });
      return response.data;
    },
  },

  // Obter anotações de uma redação
  async getAnnotations(essayId: string): Promise<AnnotationSet> {
    const response = await api.get(`/essays/${essayId}/annotations`);
    return response.data;
  },

  // Atualizar anotações
  async updateAnnotations(essayId: string, annotations: AnnotationSet): Promise<AnnotationSet> {
    try {
      const response = await api.put(`/essays/${essayId}/annotations`, annotations);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar anotações:', error);
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error('Você não tem permissão para editar estas anotações');
        } else {
          throw new Error(`Erro ao salvar anotações: ${error.response.data?.message || error.message}`);
        }
      }
      
      throw new Error('Erro ao salvar anotações. Por favor, tente novamente.');
    }
  },

  // Avaliar redação (conforme os requisitos para ENEM e PAS)
  async gradeEssay(
    essayId: string, 
    data: {
      type: 'ENEM' | 'PAS';
      enem?: {
        c1?: number; // 0, 40, 80, 120, 160 ou 200
        c2?: number; // 0, 40, 80, 120, 160 ou 200
        c3?: number; // 0, 40, 80, 120, 160 ou 200
        c4?: number; // 0, 40, 80, 120, 160 ou 200
        c5?: number; // 0, 40, 80, 120, 160 ou 200
      };
      pas?: {
        NC?: number; // Nota de conteúdo
        NE?: number; // Número de erros (contagem automática de marcações vermelhas)
        NL?: number; // Número de linhas (ajustável manualmente)
      };
      annulment?: {
        active: boolean;
        reasons: string[];
      };
      bimester?: number;
      countInAverage?: boolean;
      grade?: number; // Nota para o bimestre (se countInAverage for true)
      generalComments?: string;
    }
  ): Promise<Essay> {
    try {
      // Validações específicas para cada tipo de redação
      if (data.type === 'ENEM' && data.enem) {
        // Validar valores das competências (0, 40, 80, 120, 160, 200)
        const validValues = [0, 40, 80, 120, 160, 200];
        const competencias = [data.enem.c1, data.enem.c2, data.enem.c3, data.enem.c4, data.enem.c5];
        
        for (let i = 0; i < competencias.length; i++) {
          const comp = competencias[i];
          if (comp !== undefined && !validValues.includes(comp)) {
            throw new Error(`Valor inválido para competência ${i+1}: ${comp}. Valores permitidos: 0, 40, 80, 120, 160, 200.`);
          }
        }
      }
      
      // Se anulação estiver ativa, garantir que há pelo menos um motivo
      if (data.annulment?.active && (!data.annulment.reasons || data.annulment.reasons.length === 0)) {
        throw new Error('Para anular a redação, é necessário informar pelo menos um motivo');
      }
      
      const response = await api.put(`/essays/${essayId}/grade`, data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao avaliar redação:', error);
      
      if (error.response) {
        throw new Error(`Erro ao salvar avaliação: ${error.response.data?.message || error.message}`);
      }
      
      throw error;
    }
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
  
  // Editar uma redação pendente (usado pelo professor)
  async updatePendingEssay(essayId: string, data: {
    type?: 'ENEM' | 'PAS';
    themeId?: string;
    themeText?: string;
    studentId?: string;
    bimester?: number;
    file?: {
      originalUrl: string;
      mime: string;
      size: number;
      pages: number;
    }
  }): Promise<Essay> {
    try {
      const response = await api.put(`/essays/${essayId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao editar redação pendente:', error);
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401) {
          throw new Error('Você precisa estar autenticado como professor para editar redações');
        } else if (status === 403) {
          throw new Error('Você não tem permissão para editar esta redação');
        } else if (status === 404) {
          throw new Error('Redação não encontrada');
        } else if (status === 400) {
          const message = error.response.data?.message || 'Dados inválidos. Verifique as informações e tente novamente.';
          throw new Error(message);
        } else {
          throw new Error(`Erro no servidor (${status})`);
        }
      } else if (error.request) {
        throw new Error('Sem resposta do servidor. Verifique sua conexão de internet.');
      }
      
      throw error;
    }
  },

  // Fazer upload do arquivo de redação
  async uploadEssayFile(file: File): Promise<{ url: string; mime: string; size: number; pages: number }> {
    console.log('Iniciando upload de arquivo...');
    
    // Validação do arquivo
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    
    if (file.type !== 'application/pdf') {
      throw new Error('O arquivo deve ser um PDF');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('O arquivo não pode exceder 10MB');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/uploads/essay', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Erro durante o upload do arquivo:', error);
      
      // Mensagens de erro amigáveis baseadas na resposta do servidor
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401) {
          throw new Error('Você precisa estar autenticado para enviar uma redação');
        } else if (status === 413) {
          throw new Error('O arquivo é muito grande. Tamanho máximo: 10MB');
        } else if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error(`Erro no servidor (${status})`);
        }
      } else if (error.request) {
        throw new Error('Sem resposta do servidor. Verifique sua conexão de internet.');
      }
      
      throw error;
    }
  },
  
  // Criar uma nova redação
  async createEssay(data: {
    type: 'ENEM' | 'PAS';
    themeId?: string;
    themeText?: string;
    file: {
      originalUrl: string;
      mime: string;
      size: number;
      pages: number;
    };
    status?: 'PENDING' | 'GRADING' | 'GRADED' | 'SENT';
    studentId?: string; // Opcional, usado quando um professor cria em nome de aluno
    bimester?: number;
  }): Promise<Essay> {
    try {
      // Validações
      if (!data.file || !data.file.originalUrl) {
        throw new Error('Informações do arquivo são obrigatórias');
      }
      
      if (!data.themeId && !data.themeText) {
        throw new Error('É necessário selecionar um tema ou informar um tema personalizado');
      }
      
      // Garantir que o status inicial seja PENDING se não for especificado
      const essayData = {
        ...data,
        status: data.status || 'PENDING'
      };
      
      const response = await api.post('/essays', essayData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar redação:', error);
      
      // Mensagens de erro amigáveis
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401) {
          throw new Error('Você precisa estar autenticado para enviar uma redação');
        } else if (status === 400) {
          const message = error.response.data?.message || 'Dados inválidos. Verifique as informações e tente novamente.';
          throw new Error(message);
        } else {
          throw new Error(`Erro no servidor (${status})`);
        }
      } else if (error.request) {
        throw new Error('Sem resposta do servidor. Verifique sua conexão de internet.');
      }
      
      throw error;
    }
  }
};
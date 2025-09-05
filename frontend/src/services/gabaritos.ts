import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

export interface Gabarito {
  id: string;
  title: string;
  answerKey: string;
  numQuestions: number;
  createdAt: string;
  updatedAt: string;
}

export interface AplicacaoGabarito {
  id: string;
  gabaritoId: string;
  gabarito: Gabarito;
  classId: string;
  className: string;
  scheduledDate: string;
  status: 'draft' | 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ProcessamentoOMR {
  id: string;
  aplicacaoId: string;
  aplicacao: AplicacaoGabarito;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  results?: {
    totalProcessed: number;
    successful: number;
    errors: number;
    grades: Array<{
      studentId: string;
      studentName: string;
      score: number;
      answers: string[];
    }>;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGabaritoData {
  title: string;
  answerKey: string;
  numQuestions: number;
}

export interface UpdateGabaritoData {
  title?: string;
  answerKey?: string;
  numQuestions?: number;
}

export interface CreateAplicacaoData {
  gabaritoId: string;
  classId: string;
  scheduledDate: string;
}

/**
 * Lista todos os gabaritos em branco
 */
export async function listGabaritos(): Promise<Gabarito[]> {
  try {
    const response = await api.get('/gabaritos');
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar gabaritos:', error);
    // Retornar dados mock para desenvolvimento
    return [
      {
        id: '1',
        title: 'Prova de Matemática - 1º Bimestre',
        answerKey: 'A B C D E A B C D E',
        numQuestions: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Prova de Física - 2º Bimestre',
        answerKey: 'B C D E A B C D E A',
        numQuestions: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Cria um novo gabarito em branco
 */
export async function createGabarito(data: CreateGabaritoData): Promise<Gabarito> {
  try {
    const response = await api.post('/gabaritos', data);
    const gabarito = pickData(response);
    
    logger.info('Gabarito criado com sucesso:', { id: gabarito.id, title: gabarito.title });
    return gabarito;
  } catch (error) {
    logger.error('Erro ao criar gabarito:', error);
    // Simular criação para desenvolvimento
    const gabarito: Gabarito = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logger.info('Gabarito criado (mock):', { id: gabarito.id, title: gabarito.title });
    return gabarito;
  }
}

/**
 * Atualiza um gabarito existente
 */
export async function updateGabarito(id: string, data: UpdateGabaritoData): Promise<Gabarito> {
  try {
    const response = await api.put(`/gabaritos/${id}`, data);
    const gabarito = pickData(response);
    
    logger.info('Gabarito atualizado com sucesso:', { id, title: gabarito.title });
    return gabarito;
  } catch (error) {
    logger.error('Erro ao atualizar gabarito:', error);
    throw error;
  }
}

/**
 * Exclui um gabarito
 */
export async function deleteGabarito(id: string): Promise<void> {
  try {
    await api.delete(`/gabaritos/${id}`);
    
    logger.info('Gabarito excluído com sucesso:', { id });
  } catch (error) {
    logger.error('Erro ao excluir gabarito:', error);
    throw error;
  }
}

/**
 * Lista todas as aplicações de gabaritos
 */
export async function listAplicacoes(): Promise<AplicacaoGabarito[]> {
  try {
    const response = await api.get('/gabaritos/aplicacoes');
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar aplicações:', error);
    // Retornar dados mock para desenvolvimento
    return [
      {
        id: '1',
        gabaritoId: '1',
        gabarito: {
          id: '1',
          title: 'Prova de Matemática - 1º Bimestre',
          answerKey: 'A B C D E A B C D E',
          numQuestions: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        classId: '1',
        className: '1º A - Matemática',
        scheduledDate: new Date().toISOString(),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        gabaritoId: '2',
        gabarito: {
          id: '2',
          title: 'Prova de Física - 2º Bimestre',
          answerKey: 'B C D E A B C D E A',
          numQuestions: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        classId: '2',
        className: '2º B - Física',
        scheduledDate: new Date().toISOString(),
        status: 'closed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Lista classes (compatibilidade)
 */
export async function listClasses(): Promise<any[]> {
  try {
    const response = await api.get('/classes');
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar classes:', error);
    // Retornar dados mock para desenvolvimento
    return [
      {
        id: '1',
        name: '1º A - Matemática',
        series: '1',
        letter: 'A',
        discipline: 'Matemática'
      },
      {
        id: '2',
        name: '2º B - Física',
        series: '2',
        letter: 'B',
        discipline: 'Física'
      },
      {
        id: '3',
        name: '3º C - Química',
        series: '3',
        letter: 'C',
        discipline: 'Química'
      }
    ];
  }
}

/**
 * Cria uma nova aplicação de gabarito
 */
export async function createAplicacao(data: CreateAplicacaoData): Promise<AplicacaoGabarito> {
  try {
    const response = await api.post('/gabaritos/aplicacoes', data);
    const aplicacao = pickData(response);
    
    logger.info('Aplicação criada com sucesso:', { id: aplicacao.id, gabaritoId: data.gabaritoId });
    return aplicacao;
  } catch (error) {
    logger.error('Erro ao criar aplicação:', error);
    // Simular criação para desenvolvimento
    const gabarito = await listGabaritos().then(g => g.find(g => g.id === data.gabaritoId));
    const classe = await listClasses().then(c => c.find(c => c.id === data.classId));
    
    const aplicacao: AplicacaoGabarito = {
      id: Date.now().toString(),
      gabaritoId: data.gabaritoId,
      gabarito: gabarito!,
      classId: data.classId,
      className: classe?.name || 'Turma Desconhecida',
      scheduledDate: data.scheduledDate,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logger.info('Aplicação criada (mock):', { id: aplicacao.id, gabaritoId: data.gabaritoId });
    return aplicacao;
  }
}

/**
 * Atualiza o status de uma aplicação
 */
export async function updateAplicacaoStatus(id: string, status: 'draft' | 'open' | 'closed'): Promise<AplicacaoGabarito> {
  try {
    const response = await api.patch(`/gabaritos/aplicacoes/${id}/status`, { status });
    const aplicacao = pickData(response);
    
    logger.info('Status da aplicação atualizado:', { id, status });
    return aplicacao;
  } catch (error) {
    logger.error('Erro ao atualizar status da aplicação:', error);
    // Simular atualização para desenvolvimento
    const aplicacoes = await listAplicacoes();
    const aplicacao = aplicacoes.find(a => a.id === id);
    if (aplicacao) {
      aplicacao.status = status;
      aplicacao.updatedAt = new Date().toISOString();
    }
    
    logger.info('Status da aplicação atualizado (mock):', { id, status });
    return aplicacao!;
  }
}

/**
 * Lista processamentos OMR
 */
export async function listProcessamentos(): Promise<ProcessamentoOMR[]> {
  try {
    const response = await api.get('/gabaritos/processamentos');
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar processamentos:', error);
    // Retornar dados mock para desenvolvimento
    return [
      {
        id: '1',
        aplicacaoId: '1',
        aplicacao: {
          id: '1',
          gabaritoId: '1',
          gabarito: {
            id: '1',
            title: 'Prova de Matemática - 1º Bimestre',
            answerKey: 'A B C D E A B C D E',
            numQuestions: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          classId: '1',
          className: '1º A - Matemática',
          scheduledDate: new Date().toISOString(),
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        fileName: 'prova_mat_1bim.pdf',
        fileSize: 1024000,
        status: 'done',
        progress: 100,
        results: {
          totalProcessed: 25,
          successful: 23,
          errors: 2,
          grades: [
            { studentId: '1', studentName: 'João Silva', score: 8.5, answers: ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'] },
            { studentId: '2', studentName: 'Maria Santos', score: 9.0, answers: ['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C', 'D', 'E'] }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Inicia processamento OMR
 */
export async function startProcessamento(aplicacaoId: string, file: File): Promise<ProcessamentoOMR> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('aplicacaoId', aplicacaoId);
    
    const response = await api.post('/gabaritos/processamentos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const processamento = pickData(response);
    
    logger.info('Processamento iniciado:', { id: processamento.id, aplicacaoId });
    return processamento;
  } catch (error) {
    logger.error('Erro ao iniciar processamento:', error);
    // Simular processamento para desenvolvimento
    const aplicacoes = await listAplicacoes();
    const aplicacao = aplicacoes.find(a => a.id === aplicacaoId);
    
    const processamento: ProcessamentoOMR = {
      id: Date.now().toString(),
      aplicacaoId,
      aplicacao: aplicacao!,
      fileName: file.name,
      fileSize: file.size,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logger.info('Processamento iniciado (mock):', { id: processamento.id, aplicacaoId });
    return processamento;
  }
}

/**
 * Obtém status de um processamento
 */
export async function getProcessamentoStatus(id: string): Promise<ProcessamentoOMR> {
  try {
    const response = await api.get(`/gabaritos/processamentos/${id}`);
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao obter status do processamento:', error);
    throw error;
  }
}

/**
 * Valida gabarito
 */
export function validateGabarito(answerKey: string, numQuestions: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Remover espaços
  const cleanAnswerKey = answerKey.replace(/\s/g, '');
  
  // Verificar comprimento
  if (cleanAnswerKey.length !== numQuestions) {
    errors.push(`Gabarito deve ter exatamente ${numQuestions} respostas`);
  }
  
  // Verificar caracteres válidos
  const validAnswers = /^[ABCDE]*$/i;
  if (!validAnswers.test(cleanAnswerKey)) {
    errors.push('Gabarito deve conter apenas letras A, B, C, D ou E');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formata gabarito para exibição
 */
export function formatGabarito(answerKey: string): string {
  return answerKey.replace(/\s/g, '').split('').join(' ');
}

/**
 * Calcula estatísticas de uma aplicação
 */
export function calculateAplicacaoStats(aplicacao: AplicacaoGabarito, processamentos: ProcessamentoOMR[]) {
  const aplicacaoProcessamentos = processamentos.filter(p => p.aplicacaoId === aplicacao.id);
  
  const totalProcessed = aplicacaoProcessamentos.reduce((sum, p) => {
    return sum + (p.results?.totalProcessed || 0);
  }, 0);
  
  const successful = aplicacaoProcessamentos.reduce((sum, p) => {
    return sum + (p.results?.successful || 0);
  }, 0);
  
  const errors = aplicacaoProcessamentos.reduce((sum, p) => {
    return sum + (p.results?.errors || 0);
  }, 0);
  
  const pending = aplicacaoProcessamentos.filter(p => p.status === 'queued' || p.status === 'processing').length;
  
  return {
    totalProcessed,
    successful,
    errors,
    pending,
    completionRate: totalProcessed > 0 ? Math.round((successful / totalProcessed) * 100) : 0
  };
}

export default {
  listGabaritos,
  createGabarito,
  updateGabarito,
  deleteGabarito,
  listAplicacoes,
  createAplicacao,
  updateAplicacaoStatus,
  listProcessamentos,
  startProcessamento,
  getProcessamentoStatus,
  validateGabarito,
  formatGabarito,
  calculateAplicacaoStats,
};

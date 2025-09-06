import { api, pickData } from '@/services/api';

export async function createGabarito(formData) {
  const res = await api.post('/gabaritos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'arraybuffer',
  });
  return res.data;
}

/**
 * Lista todos os gabaritos
 */
export async function listGabaritos() {
  try {
    const response = await api.get('/gabaritos');
    return pickData(response);
  } catch (error) {
    console.error('Erro ao carregar gabaritos:', error);
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
 * Atualiza um gabarito existente
 */
export async function updateGabarito(id, data) {
  try {
    const response = await api.put(`/gabaritos/${id}`, data);
    const gabarito = pickData(response);
    
    console.info('Gabarito atualizado com sucesso:', { id, title: gabarito.title });
    return gabarito;
  } catch (error) {
    console.error('Erro ao atualizar gabarito:', error);
    throw error;
  }
}

/**
 * Exclui um gabarito
 */
export async function deleteGabarito(id) {
  try {
    await api.delete(`/gabaritos/${id}`);
    
    console.info('Gabarito excluído com sucesso:', { id });
  } catch (error) {
    console.error('Erro ao excluir gabarito:', error);
    throw error;
  }
}

/**
 * Lista todas as aplicações de gabaritos
 */
export async function listAplicacoes() {
  try {
    const response = await api.get('/gabaritos/aplicacoes');
    return pickData(response);
  } catch (error) {
    console.error('Erro ao carregar aplicações:', error);
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
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Cria uma nova aplicação de gabarito
 */
export async function createAplicacao(data) {
  try {
    const response = await api.post('/gabaritos/aplicacoes', data);
    const aplicacao = pickData(response);
    
    console.info('Aplicação criada com sucesso:', { id: aplicacao.id, gabaritoId: data.gabaritoId });
    return aplicacao;
  } catch (error) {
    console.error('Erro ao criar aplicação:', error);
    // Simular criação para desenvolvimento
    const gabaritos = await listGabaritos();
    const gabarito = gabaritos.find(g => g.id === data.gabaritoId);
    
    const aplicacao = {
      id: Date.now().toString(),
      gabaritoId: data.gabaritoId,
      gabarito: gabarito,
      classId: data.classId,
      className: 'Turma Desconhecida',
      scheduledDate: data.scheduledDate,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.info('Aplicação criada (mock):', { id: aplicacao.id, gabaritoId: data.gabaritoId });
    return aplicacao;
  }
}

/**
 * Atualiza o status de uma aplicação
 */
export async function updateAplicacaoStatus(id, status) {
  try {
    const response = await api.patch(`/gabaritos/aplicacoes/${id}/status`, { status });
    const aplicacao = pickData(response);
    
    console.info('Status da aplicação atualizado:', { id, status });
    return aplicacao;
  } catch (error) {
    console.error('Erro ao atualizar status da aplicação:', error);
    // Simular atualização para desenvolvimento
    const aplicacoes = await listAplicacoes();
    const aplicacao = aplicacoes.find(a => a.id === id);
    if (aplicacao) {
      aplicacao.status = status;
      aplicacao.updatedAt = new Date().toISOString();
    }
    
    console.info('Status da aplicação atualizado (mock):', { id, status });
    return aplicacao;
  }
}

/**
 * Calcula estatísticas de uma aplicação
 */
export function calculateAplicacaoStats(aplicacao, processamentos) {
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

/**
 * Lista todos os processamentos OMR
 */
export async function listProcessamentos() {
  try {
    const response = await api.get('/gabaritos/processamentos');
    return pickData(response);
  } catch (error) {
    console.error('Erro ao carregar processamentos:', error);
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
        status: 'completed',
        progress: 100,
        results: {
          totalProcessed: 25,
          successful: 23,
          errors: 2
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/**
 * Inicia um processamento OMR
 */
export async function startProcessamento(aplicacaoId, file) {
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
    
    console.info('Processamento iniciado:', { id: processamento.id, aplicacaoId });
    return processamento;
  } catch (error) {
    console.error('Erro ao iniciar processamento:', error);
    // Simular processamento para desenvolvimento
    const aplicacoes = await listAplicacoes();
    const aplicacao = aplicacoes.find(a => a.id === aplicacaoId);
    
    const processamento = {
      id: Date.now().toString(),
      aplicacaoId,
      aplicacao: aplicacao,
      fileName: file.name,
      fileSize: file.size,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.info('Processamento iniciado (mock):', { id: processamento.id, aplicacaoId });
    return processamento;
  }
}

export default { 
  createGabarito,
  listGabaritos,
  updateGabarito,
  deleteGabarito,
  listAplicacoes,
  createAplicacao,
  updateAplicacaoStatus,
  calculateAplicacaoStats,
  listProcessamentos,
  startProcessamento
};

import { api } from './api';

export const enviarRedacao = async (formData) => {
  const res = await api.post('/redacoes/enviar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const listarRedacoes = async (status, filters = {}) => {
  const res = await api.get('/redacoes/professor', {
    params: { status, ...filters },
  });
  return res.data;
};

// Wrappers for common listing statuses used in the application
export const listarPendentes = (filters = {}) =>
  listarRedacoes('pendente', filters);

export const listarCorrigidas = (filters = {}) =>
  listarRedacoes('corrigida', filters);

export const listarRedacoesAluno = async () => {
  const res = await api.get('/redacoes');
  return res.data;
};

/**
 * Envia os dados de correção de uma redação.
 *
 * @param {string} id      Identificador da redação a ser corrigida.
 * @param {object} payload Objeto contendo o tipo selecionado, as
 *                         competências ou os campos de PAS/UnB, o motivo
 *                         de anulação (quando houver) e as anotações feitas
 *                         no texto.
 */
export const corrigirRedacao = async (id, payload) => {
  const res = await api.post(`/redacoes/${id}/corrigir`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export default {
  enviarRedacao,
  listarRedacoes,
  listarPendentes,
  listarCorrigidas,
  listarRedacoesAluno,
  corrigirRedacao,
};

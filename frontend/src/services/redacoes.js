import axios from 'axios';

const API_URL = 'http://localhost:5000';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const enviarRedacao = async (formData) => {
  const res = await axios.post(`${API_URL}/redacoes/enviar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
  });
  return res.data;
};

export const listarRedacoes = async (status, filters = {}) => {
  const res = await axios.get(`${API_URL}/redacoes/professor`, {
    headers: authHeaders(),
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
  const res = await axios.get(`${API_URL}/redacoes`, {
    headers: authHeaders(),
  });
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
  const res = await axios.post(`${API_URL}/redacoes/${id}/corrigir`, payload, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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

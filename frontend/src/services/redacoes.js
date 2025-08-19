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

export const listarRedacoesAluno = async () => {
  const res = await axios.get(`${API_URL}/redacoes`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const corrigirRedacao = async (id, data) => {
  const res = await axios.post(`${API_URL}/redacoes/${id}/corrigir`, data, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return res.data;
};

export default {
  enviarRedacao,
  listarRedacoes,
  listarRedacoesAluno,
  corrigirRedacao,
};

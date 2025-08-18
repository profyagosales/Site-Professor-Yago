import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const enviarRedacao = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');
  const res = await axios.post(`${API_URL}/redacoes`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onUploadProgress,
  });
  return res.data;
};

export const listarRedacoesAluno = async () => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_URL}/redacoes`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
};

export const listarPendentes = async () => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_URL}/redacoes/professor`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params: { status: 'pendente' },
  });
  return res.data;
};

export const listarCorrigidas = async (filtros = {}) => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_URL}/redacoes/professor`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params: { status: 'corrigida', ...filtros },
  });
  return res.data;
};

export default {
  enviarRedacao,
  listarRedacoesAluno,
  listarPendentes,
  listarCorrigidas,
};

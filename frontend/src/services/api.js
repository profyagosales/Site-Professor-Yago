import axios from 'axios';
import { API_BASE } from '@/lib/api';

// baseURL centralizado; cai para /api por padrão
const api = axios.create({
  baseURL: API_BASE,
});

const pickData = (r) => (r?.data?.data ?? r?.data ?? r);
const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);

// injeta token, se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const loginTeacher = (data) => api.post('/auth/login-teacher', data).then(pickData);

// versão padrão: autentica aluno por email e senha
export async function loginStudent({ email, password }) {
  return api.post('/auth/login-student', { email, password }).then(pickData);
}

// compatibilidade temporária com a antiga assinatura
const loginStudentLegacy = (data) =>
  api.post('/auth/login-student', data).then(pickData);

export default api;
export {
  api,
  pickData,
  toArray,
  loginTeacher,
  loginStudentLegacy,
};

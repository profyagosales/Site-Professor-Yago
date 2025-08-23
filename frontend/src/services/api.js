import axios from 'axios';

// baseURL vem do ambiente em produção; cai para localhost no dev
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050',
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
  return axios
    .post('/auth/login-student', { email, password })
    .then((r) => r.data?.ok);
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

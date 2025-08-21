import axios from 'axios';

// baseURL vem do ambiente em produção; cai para localhost no dev
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050',
});

// injeta token, se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { api };

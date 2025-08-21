// frontend/src/services/api.js
import axiosLib from 'axios';

const baseURL =
  (import.meta?.env?.VITE_API_URL) ||
  (typeof window !== 'undefined' && window.__API_URL__) ||
  'http://localhost:5050'; // fallback só para dev local

const api = axiosLib.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { api };

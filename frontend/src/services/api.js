import axiosLib from 'axios';

const api = axiosLib.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { api };


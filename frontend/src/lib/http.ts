import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || ''; // pode vir 'https://.../api'

export const api = axios.create({
  baseURL, // ex.: https://site-professor-yago.onrender.com/api
  withCredentials: true,
  timeout: 20000,
});

export default api;

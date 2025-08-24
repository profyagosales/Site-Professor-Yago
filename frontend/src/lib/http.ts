import axios from 'axios';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''); // sem barra final
export const http = axios.create({
  baseURL: `${API}/api`,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // habilite só se usar cookies
});

export default http;

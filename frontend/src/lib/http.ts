import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://site-professor-yago.onrender.com/api',
  withCredentials: true, // envia cookies cross-site
  headers: { 'Content-Type': 'application/json' },
});

// Bootstrap do Bearer, se existir (fallback caso cookie seja bloqueado)
const saved = localStorage.getItem('auth_token');
if (saved) api.defaults.headers.common['Authorization'] = `Bearer ${saved}`;

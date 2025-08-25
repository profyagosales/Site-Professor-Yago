import axios from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '';
const PREFIX = (import.meta as any).env?.VITE_API_PREFIX ?? '/api';

export const api = axios.create({
  baseURL: `${String(BASE)}${String(PREFIX || '')}`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token when available (backend also accepts cookie "session")
api.interceptors.request.use((cfg) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      cfg.headers = cfg.headers || {};
      (cfg.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {}
  return cfg;
});

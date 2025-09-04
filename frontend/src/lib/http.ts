import axios from 'axios';

const RAW_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  '';
const RAW_PREFIX = (import.meta as any).env?.VITE_API_PREFIX ?? '/api';

function joinBasePrefix(base: string, prefix: string) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(prefix || '').replace(/^\/+/, '');
  if (!p) return b;
  // Evita /api duplicado (quando BASE já termina com /api e PREFIX = /api)
  if (b.match(/\/(api)(?:\/)?$/) && p === 'api') return b;
  return `${b}/${p}`;
}

// Preferir caminho relativo em produção (Vercel) para usar rewrites e evitar CORS e bases duplicadas
const isBrowser =
  typeof window !== 'undefined' && typeof location !== 'undefined';
const onVercel = isBrowser && /vercel\.app$/i.test(location.hostname);

const BASE_URL = onVercel ? '/api' : joinBasePrefix(RAW_BASE, RAW_PREFIX);

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token when available (backend also accepts cookie "session")
api.interceptors.request.use(cfg => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      cfg.headers = (cfg.headers || {}) as any;
      (cfg.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {}
  return cfg;
});

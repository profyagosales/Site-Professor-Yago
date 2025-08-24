import axios from 'axios';

const base = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || '';

export const http = axios.create({
  baseURL: `${base}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Função para "acordar" o Render antes de enviar credenciais
export async function warmBackend() {
  try {
    await http.get('/health', { timeout: 10000 });
  } catch {
    // silencioso — se falhar, o login ainda tenta normalmente
  }
}

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

export const api = http; // compat


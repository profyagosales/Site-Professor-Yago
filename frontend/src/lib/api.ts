import axios from 'axios';

const base =
  (typeof window !== 'undefined' && (window as any).__API_URL__?.replace(/\/+$/, '')) ||
  '';
// A API no backend expõe /auth, /classes, etc sob /api/...
export const api = axios.create({
  baseURL: `${base}/api`,
  withCredentials: true,
  timeout: 30000, // 30s (Render pode demorar na 1ª chamada)
});

// Função para "acordar" o Render antes de enviar credenciais
export async function warmBackend() {
  try {
    await api.get('/health', { timeout: 10000 });
  } catch {
    // silencioso — se falhar, o login ainda tenta normalmente
  }
}

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);


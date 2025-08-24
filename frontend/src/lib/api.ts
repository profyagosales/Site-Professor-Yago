import { api } from './http';

// Função para "acordar" o Render antes de enviar credenciais
export async function warmBackend() {
  try {
    await api.get('/healthz', { timeout: 10000 });
  } catch {
    // silencioso — se falhar, o login ainda tenta normalmente
  }
}

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

export { api };
export default api;


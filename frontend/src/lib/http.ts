import axios from 'axios';

let API_URL = process.env.VITE_API_URL;
if (!API_URL) {
  try {
    API_URL = new Function('return import.meta.env.VITE_API_URL')();
  } catch {}
}
if (!API_URL) {
  // Falha cedo pra não subir build apontando pra /api relativo
  throw new Error('VITE_API_URL não definido. Configure no Vercel.');
}

export const api = axios.create({
  baseURL: API_URL, // ex.: https://api-site-professor-yago.vercel.app
  withCredentials: true,
  timeout: 15000,
});

// Interceptores p/ UX melhor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // sessão expirada → volta pro login
      window.location.href = '/login-professor';
    }
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Falha ao comunicar com o servidor';
    // opcional: use seu sistema de toast
    console.error('[API ERROR]', status, msg);
    return Promise.reject(err);
  }
);

export const pickData = (r) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

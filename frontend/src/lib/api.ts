import axios from "axios";

const BASE = import.meta.env.VITE_API_URL?.trim() ||
  "https://site-professor-yago.onrender.com"; // fallback seguro

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  validateStatus: () => true, // não joga exceção, ajuda a debugar
});

// helper de diagnóstico
export async function ping() {
  try {
    const r = await api.get("/health"); // ou /api/healthz se você tiver esse alias
    console.log("[PING] backend ok:", r.status, r.data, "base:", BASE);
    return r.status < 500;
  } catch (e) {
    console.log("[PING] backend erro:", e, "base:", BASE);
    return false;
  }
}

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

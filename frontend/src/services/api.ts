import axios from "axios";

function normalizeBase(raw?: string) {
  const v = (raw || "").trim();
  if (!v) return "/api"; // fallback dev
  const noTrail = v.replace(/\/+$/, "");
  return noTrail;
}

const BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL);

export const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
});

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info("[API] baseURL:", BASE);
}

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

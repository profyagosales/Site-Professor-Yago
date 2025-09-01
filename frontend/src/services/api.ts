import axios from "axios";

function pickBaseEnv() {
  // preferencial
  let raw =
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ?? // legado
    "";

  raw = (raw || "").trim();

  // fallback seguro: usa o origin + /api (caso Vercel rewrites esteja ok)
  if (!raw) raw = `${window.location.origin}/api`;

  // normaliza para garantir /api no final, sem duplicar
  const url = new URL(raw, window.location.origin);
  let pathname = url.pathname.replace(/\/+$/, ""); // remove trailing slash

  if (!/\/api$/.test(pathname)) pathname = `${pathname}/api`;

  url.pathname = pathname;

  return url.toString().replace(/\/+$/, ""); // sem trailing slash
}

const BASE_URL = pickBaseEnv();

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem("auth_token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("auth_token");
    delete api.defaults.headers.common.Authorization;
  }
}

// reaplica token no boot
(() => {
  const t = localStorage.getItem("auth_token");
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
})();

// 401 passivo; o guard decide o que fazer
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

// helper usado pelos services
export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

// (temporário) logue uma vez o BASE_URL para ver no Console (remover depois)
if (!window.__API_BASE_LOGGED__) {
  // @ts-expect-error
  window.__API_BASE_LOGGED__ = true;
  console.info("[API] baseURL:", BASE_URL);
}

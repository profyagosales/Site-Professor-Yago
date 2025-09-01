import axios from "axios";

const raw = import.meta.env.VITE_API_BASE_URL || "/api";
let baseURL = raw.replace(/\/$/, "");
// Garante que URLs absolutas do backend terminem com /api
if (/^https?:\/\//.test(baseURL) && !/\/api$/.test(baseURL)) {
  baseURL = `${baseURL}/api`;
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    try { localStorage.setItem("auth_token", token); } catch {}
  } else {
    delete (api.defaults.headers.common as any).Authorization;
    try { localStorage.removeItem("auth_token"); } catch {}
  }
}

// Carrega token salvo ao iniciar app
try {
  const persisted = localStorage.getItem("auth_token");
  if (persisted) setAuthToken(persisted);
} catch {}

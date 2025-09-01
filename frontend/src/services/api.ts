import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token?: string) {
  if (token) {
    try { localStorage.setItem("auth_token", token); } catch {}
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    try { localStorage.removeItem("auth_token"); } catch {}
    delete (api.defaults.headers.common as any).Authorization;
  }
}

// bootstrap do token ao carregar o bundle
(() => {
  try {
    const persisted = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (persisted) api.defaults.headers.common.Authorization = `Bearer ${persisted}`;
  } catch {}
})();

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

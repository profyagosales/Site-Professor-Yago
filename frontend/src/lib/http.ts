import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://site-professor-yago.onrender.com/api",
  withCredentials: true, // necessário para cookie HttpOnly
  headers: { "Content-Type": "application/json" },
});

export function installAuthInterceptors(onUnauthorized: () => void) {
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) onUnauthorized?.();
      return Promise.reject(err);
    }
  );
}


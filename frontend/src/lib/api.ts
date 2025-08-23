import axios from "axios";
import { API_URL } from "./env";

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL ausente; usando /api");
}

// Interceptor to avoid breaking UI on API errors
api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error("API error:", err?.response?.status, err?.config?.url);
    return Promise.reject(err);
  }
);

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

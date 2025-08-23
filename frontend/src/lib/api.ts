import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";
export const api = axios.create({ baseURL, withCredentials: true });

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

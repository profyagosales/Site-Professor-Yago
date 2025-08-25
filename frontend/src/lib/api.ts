import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://site-professor-yago.onrender.com/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

export { api };
export default api;

import axios from "axios";

// 1) Base URL prioriza VITE_API_BASE_URL em prod.
// 2) Em dev, deixamos vazio e o Vite proxy cuida do /api.
const RAW = import.meta.env.VITE_API_BASE_URL?.trim() || "";
// normaliza para não ter barra dupla depois
const BASE =
  RAW !== ""
    ? RAW.replace(/\/+$/, "")
    : "";

// ATENÇÃO: quando BASE !== "", todas as chamadas devem ser relativas (ex.: "/auth/login-teacher")
// para evitar "/api/api". Quando BASE é vazio (dev), as chamadas devem incluir "/api/"
export const api = axios.create({
  baseURL: BASE, // ex.: https://api.professoryagosales.com.br/api
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Opcional: já injeta Authorization se existir token salvo
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("auth_token");
  if (t && !config.headers?.Authorization) {
    config.headers = { ...config.headers, Authorization: `Bearer ${t}` };
  }
  return config;
});

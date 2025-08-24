import axios from "axios";

const FALLBACK = "https://site-professor-yago.onrender.com/api";
const RAW = import.meta.env.VITE_API_URL || "";
const BASE = (RAW || FALLBACK).replace(/\/+$/,""); // sem barra no final

if (!RAW && import.meta.env.PROD) {
  // Se a env não vier no build, avisa e usa fallback
  console.warn("[HTTP] VITE_API_URL ausente em produção. Usando fallback:", FALLBACK);
}

export const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
  withCredentials: false,
});

// helper para montar URLs absolutas quando precisar
export const apiUrl = (path: string) =>
  `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;

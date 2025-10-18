import axios from 'axios';

const rawBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
const cleanedBase =
  typeof rawBase === 'string' && rawBase.trim()
    ? rawBase.trim().replace(/\/+$/, '')
    : '';
const baseURL = cleanedBase
  ? (cleanedBase.endsWith('/api') ? cleanedBase : `${cleanedBase}/api`)
  : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

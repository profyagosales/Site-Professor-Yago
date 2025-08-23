export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
export const api = (p: string) => `${API_BASE}${p}`;

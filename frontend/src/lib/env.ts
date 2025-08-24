export const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  (window as any).__API_URL__ ||
  '';


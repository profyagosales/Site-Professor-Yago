let base = '/api';
if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE) {
  base = process.env.VITE_API_BASE;
} else {
  try {
    base = eval('import.meta')?.env?.VITE_API_BASE ?? base;
  } catch {
    /* ignore */
  }
}
export const API_BASE = base;
export const api = (path) => `${API_BASE}${path}`;
export default api;

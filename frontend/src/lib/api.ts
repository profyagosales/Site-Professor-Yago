import { api } from './http';

api.interceptors.request.use((config) => {
  if (config.headers) {
    try { delete (config.headers as any)['Content-Type']; } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('role');
      } catch {}
      if (typeof window !== 'undefined') {
        const here = window.location.pathname;
        if (!/login-professor/.test(here)) {
          window.location.replace('/login-professor');
        }
      }
    }
    return Promise.reject(error);
  }
);

export const pickData = (r: any) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

export { api };
export default api;

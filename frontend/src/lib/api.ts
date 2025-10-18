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
    const skipRedirect = (error?.config as any)?.meta?.skipAuthRedirect;
    if (!skipRedirect && error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        try {
          const here = `${window.location.pathname}${window.location.search}`;
          if (!/login-professor/.test(here)) {
            const next = encodeURIComponent(here || '/professor/resumo');
            window.location.replace(`/login-professor?next=${next}`);
          }
        } catch {
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

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { isAuthRedirectLocked, setAuthRedirectLock } from '@/constants/authRedirect';
// Lazy reference para evitar import cíclico direto do provider
let markSessionExpiredGlobal: (() => void) | null = null;
export function __registerSessionExpiredMarker(fn: () => void) { markSessionExpiredGlobal = fn }

// URL padrão para produção
const defaultApiUrl = 'https://api.professoryagosales.com.br';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Sempre enviar cookies para suportar autenticação baseada em cookies
  withCredentials: true,
});

// Log da URL base usada
console.log(`API Base URL: ${api.defaults.baseURL}`);

// Interceptador para adicionar token de autenticação nas requisições
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Se não estiver usando cookie auth, adiciona o token no header
    // Sempre adiciona Authorization se houver token local como fallback
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar erros de resposta
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      const now = Date.now();
      // Limpa credenciais locais
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Marca sessão expirada para UI reagir (modal, etc.)
      try { markSessionExpiredGlobal?.() } catch {}

      const isAuthCheck = error.config?.url?.includes('/auth/me');
      if (isAuthCheck) {
        if (isAuthRedirectLocked(now)) {
          console.warn('Redirect /auth-error suprimido (lock ativo)');
        } else {
          // Em vez de redirecionar imediatamente, aguardamos breve tempo para UI mostrar modal (se configurado)
          setAuthRedirectLock(now);
          (window as any).__lastAuthRedirect = now;
          setTimeout(() => {
            // Se durante o atraso o provider já revalidou, não redireciona
            if (localStorage.getItem('user')) return;
            window.location.href = '/auth-error';
          }, 1200);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api }; // export nomeado para compatibilidade com imports existentes
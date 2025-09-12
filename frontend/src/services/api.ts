import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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
    if (import.meta.env.VITE_USE_COOKIE_AUTH !== 'true') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
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
    // Tratar erro 401 (não autenticado)
    if (error.response && error.response.status === 401) {
      // Se o token expirou ou é inválido, limpa dados de autenticação
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Verifica se é uma requisição /auth/me (verificação de autenticação)
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      
      // Redireciona para a página de erro de autenticação apenas se for uma verificação explícita
      // para não interromper outras operações com redirecionamentos desnecessários
      if (isAuthCheck) {
        window.location.href = '/auth-error';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api }; // export nomeado para compatibilidade com imports existentes
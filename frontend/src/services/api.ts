import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Sempre enviar cookies para suportar autenticação baseada em cookies
  withCredentials: true,
});

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
      // Se o token expirou ou é inválido, redireciona para o login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redireciona para a página inicial
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
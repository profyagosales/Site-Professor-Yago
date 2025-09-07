import axios from 'axios';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: import.meta.env.VITE_USE_COOKIE_AUTH === 'true',
});

// Interceptador para adicionar token de autenticação nas requisições
api.interceptors.request.use(
  (config) => {
    // Se não estiver usando cookie auth, adiciona o token no header
    if (import.meta.env.VITE_USE_COOKIE_AUTH !== 'true') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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
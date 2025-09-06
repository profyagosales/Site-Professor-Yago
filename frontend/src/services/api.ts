import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

// Criar instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // Não enviar cookies automaticamente
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptador para adicionar o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratamento de erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratar erros 401 (não autorizado)
    if (error.response && error.response.status === 401) {
      // Limpar token do localStorage
      localStorage.removeItem('token');
      
      // O redirecionamento será feito pelo componente AuthGate
    }
    
    return Promise.reject(error);
  }
);

// Função para definir o token de autenticação
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;

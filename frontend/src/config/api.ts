/**
 * Configuração da API compatível com Jest
 */

// Configuração da API compatível com Jest
export const API_BASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'http://localhost:5050'
    : 'http://localhost:5050'; // Em produção, usar variável de ambiente real

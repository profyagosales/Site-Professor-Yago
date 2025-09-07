/**
 * Utilitários para manipulação de cookies
 */

// Configuração padrão para cookies de autenticação
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction, // Em produção, apenas enviado via HTTPS
    sameSite: isProduction ? 'none' : 'lax', // Em produção: 'none' para permitir cross-site (requer secure:true)
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    path: '/' // Disponível em todo o site
  };
};

module.exports = {
  getAuthCookieOptions
};

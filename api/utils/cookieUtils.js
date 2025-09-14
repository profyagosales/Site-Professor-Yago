/**
 * Utilitários para manipulação de cookies
 */

// Configuração padrão para cookies de autenticação
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Em produção, configurações para permitir cookies entre domínios diferentes
  const cookieOptions = {
    httpOnly: true, 
    secure: isProduction, // Em produção, apenas enviado via HTTPS
    sameSite: isProduction ? 'none' : 'lax', // Em produção: 'none' para permitir cross-site
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    path: '/', // Disponível em todo o site
    domain: isProduction ? '.professoryagosales.com.br' : undefined // garante envio entre subdomínios
  };

  console.log('Configurações de Cookie:', cookieOptions);
  
  return cookieOptions;
};

module.exports = {
  getAuthCookieOptions
};

/**
 * Utilitários para manipulação de cookies
 */

// Configuração padrão para cookies de autenticação
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const useCookieAuth = process.env.USE_COOKIE_AUTH === 'true';

  // Regras:
  // - Se useCookieAuth ativo, precisamos permitir envio cross-site => SameSite=None; Secure true (mesmo em staging se HTTPS)
  // - Dominio: aplicar sempre que produção OU variável APP_DOMAIN definida
  const baseDomain = process.env.APP_DOMAIN || 'professoryagosales.com.br';
  const domain = (isProduction || useCookieAuth) ? (baseDomain.startsWith('.') ? baseDomain : `.${baseDomain}`) : undefined;

  const cookieOptions = {
    httpOnly: true,
    secure: useCookieAuth ? true : isProduction,
    sameSite: useCookieAuth ? 'none' : (isProduction ? 'none' : 'lax'),
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
    domain
  };

  console.log('Configurações de Cookie calculadas:', cookieOptions);
  return cookieOptions;
};

module.exports = {
  getAuthCookieOptions
};

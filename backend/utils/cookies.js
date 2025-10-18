const AUTH_COOKIE = 'auth_token';

const DEFAULT_COOKIE_DOMAIN = '.professoryagosales.com.br';

function resolveCookieDomain() {
  const fromEnv = process.env.COOKIE_DOMAIN;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return DEFAULT_COOKIE_DOMAIN;
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    domain: resolveCookieDomain(),
  };
}

module.exports = {
  AUTH_COOKIE,
  authCookieOptions,
  DEFAULT_COOKIE_DOMAIN,
  resolveCookieDomain,
};

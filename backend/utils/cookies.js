const AUTH_COOKIE = 'auth_token';

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    domain: '.professoryagosales.com.br',
  };
}

module.exports = {
  AUTH_COOKIE,
  authCookieOptions,
};

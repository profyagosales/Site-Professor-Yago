const jwt = require('jsonwebtoken');
const { AUTH_COOKIE, authCookieOptions } = require('./cookies');

const SESSION_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_SECONDS = 4 * 60 * 60;

function ensureSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }
  return secret;
}

function signSessionToken(payload, expiresIn = '24h') {
  const secret = ensureSecret();
  return jwt.sign(payload, secret, { expiresIn });
}

function setAuthCookie(res, token, maxAgeMs = SESSION_COOKIE_MAX_AGE_MS) {
  if (!res || typeof res.cookie !== 'function') return;
  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions(), maxAge: maxAgeMs });
}

function shouldRefreshToken(decoded, thresholdSeconds = REFRESH_THRESHOLD_SECONDS) {
  if (!decoded || typeof decoded.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now <= thresholdSeconds;
}

function sanitizePayload(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const clone = { ...decoded };
  delete clone.iat;
  delete clone.exp;
  delete clone.nbf;
  delete clone.jti;
  return clone;
}

function ensureSubject(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (!payload.sub && (payload.id || payload._id)) {
    payload.sub = String(payload.id || payload._id);
  }
  return payload;
}

function maybeRefreshSession(req, res, decoded) {
  const fromCookie = typeof req?.cookies?.[AUTH_COOKIE] === 'string' && req.cookies[AUTH_COOKIE];
  if (!fromCookie || !decoded) return null;
  if (!shouldRefreshToken(decoded)) return null;
  const payload = ensureSubject(sanitizePayload(decoded));
  if (!payload || !payload.sub) return null;
  const token = signSessionToken(payload);
  setAuthCookie(res, token, SESSION_COOKIE_MAX_AGE_MS);
  return token;
}

module.exports = {
  signSessionToken,
  setAuthCookie,
  shouldRefreshToken,
  sanitizePayload,
  maybeRefreshSession,
  SESSION_COOKIE_MAX_AGE_MS,
  REFRESH_THRESHOLD_SECONDS,
  AUTH_COOKIE,
  authCookieOptions,
};

const jwt = require('jsonwebtoken');

const SESSION_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_SECONDS = 4 * 60 * 60;
const DEFAULT_DOMAIN_SUFFIX = 'professoryagosales.com.br';

function safeHostname(req) {
  try {
    if (req && typeof req.hostname === 'string' && req.hostname) {
      return req.hostname;
    }
  } catch (_err) {
    // ignore accessor failures (e.g. proxy fn not compiled yet)
  }
  return undefined;
}

function resolveHost(req) {
  if (!req) return undefined;
  const direct = safeHostname(req);
  if (direct) return direct;
  const headerHost = req?.headers && typeof req.headers.host === 'string' ? req.headers.host : undefined;
  if (!headerHost) return undefined;
  return headerHost.split(':')[0];
}

function resolveCookieDomain(req) {
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  const host = resolveHost(req);
  if (host && host.endsWith(`.${DEFAULT_DOMAIN_SUFFIX}`)) {
    return `.${DEFAULT_DOMAIN_SUFFIX}`;
  }
  if (host === DEFAULT_DOMAIN_SUFFIX) {
    return `.${DEFAULT_DOMAIN_SUFFIX}`;
  }
  return undefined;
}

function resolveSecureFlag(req) {
  if (String(process.env.FORCE_SECURE_COOKIES).toLowerCase() === 'true') {
    return true;
  }

  try {
    if (req?.secure === true) return true;
  } catch (_err) {
    // ignore accessor failures
  }

  if (req?.socket?.encrypted || req?.connection?.encrypted) {
    return true;
  }

  const forwarded = req?.headers?.['x-forwarded-proto'] || req?.headers?.['x-forwarded-protocol'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim().toLowerCase();
    if (first === 'https') return true;
  }

  const scheme = req?.headers?.['x-forwarded-scheme'] || req?.headers?.scheme;
  if (typeof scheme === 'string' && scheme.trim().toLowerCase() === 'https') {
    return true;
  }

  try {
    if (typeof req?.protocol === 'string') {
      return req.protocol === 'https';
    }
  } catch (_err) {
    // ignore when protocol accessor fails
  }

  return process.env.NODE_ENV === 'production';
}

function computeCookieBase(req) {
  const secure = resolveSecureFlag(req);
  const domain = resolveCookieDomain(req);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

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

function setAuthCookie(res, token, maxAgeMs = SESSION_COOKIE_MAX_AGE_MS, req = undefined) {
  if (!res || typeof res.cookie !== 'function') return;
  const base = computeCookieBase(req || res?.req);
  res.cookie('auth_token', token, { ...base, maxAge: maxAgeMs });
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
  const fromCookie = typeof req?.cookies?.auth_token === 'string' && req.cookies.auth_token;
  if (!fromCookie || !decoded) return null;
  if (!shouldRefreshToken(decoded)) return null;
  const payload = ensureSubject(sanitizePayload(decoded));
  if (!payload || !payload.sub) return null;
  const token = signSessionToken(payload);
  setAuthCookie(res, token, SESSION_COOKIE_MAX_AGE_MS, req);
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
  computeCookieBase,
};

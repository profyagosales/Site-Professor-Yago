// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { maybeRefreshSession } = require('../utils/sessionToken');

/**
 * Lê token de: Cookie (token|access_token), Authorization: Bearer, ou x-access-token
 */
function extractTokens(req) {
  const tokens = [];
  const headers = req?.headers || {};
  const cookies = req?.cookies || {};

  try {
    const rawAuth = headers.authorization || headers.Authorization;
    if (typeof rawAuth === 'string' && rawAuth.trim()) {
      const match = rawAuth.match(/^Bearer\s+(.+)$/i);
      if (match && match[1]) {
        tokens.push(match[1].trim());
      }
    }
  } catch (_err) {
    // ignore malformed authorization header
  }

  if (typeof headers['x-access-token'] === 'string' && headers['x-access-token']) {
    tokens.push(headers['x-access-token']);
  }

  ['auth_token', 'token', 'access_token'].forEach((name) => {
    try {
      const value = cookies?.[name];
      if (typeof value === 'string' && value) {
        tokens.push(value);
      }
    } catch (_err) {
      // ignore cookie access errors
    }
  });

  return tokens;
}

function readToken(req) {
  const tokens = extractTokens(req);
  return tokens.length ? tokens[0] : null;
}

/**
 * Decodifica e normaliza o payload do JWT
 */
function decodeUser(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const dec = jwt.verify(token, secret);
  if (!dec || typeof dec !== 'object') return null;

  // Normalização básica
  const id = String(dec._id || dec.id || dec.sub || '');
  const role = dec.role || dec.profile || dec.tipo || undefined;
  const email = dec.email || undefined;

  return {
    _id: id || undefined,
    id: id || undefined,
    role,
    email,
    ...dec,
  };
}

/**
 * Compat: muitos handlers legados checam `req.profile`.
 * Aqui espelhamos para manter tudo funcionando sem mexer nas rotas antigas.
 */
function attachUser(req, user) {
  req.user = user || null;
  if (user && user.role && !req.profile) {
    req.profile = user.role; // <<< SHIM de compatibilidade
  }
  // opcional: útil em templates/logs
  if (req.res?.locals) req.res.locals.user = req.user;
}

function refreshUserIfNeeded(req, res, user) {
  if (!user) return user;
  try {
    const refreshedToken = maybeRefreshSession(req, res, user);
    if (!refreshedToken) return user;
    return decodeUser(refreshedToken) || user;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[AUTH] Falha ao renovar sessão', err?.message || err);
    }
    return user;
  }
}

function selectUserFromTokens(req, res) {
  const tokens = extractTokens(req);
  if (!tokens.length) return { user: null, token: null };

  for (const candidate of tokens) {
    if (!candidate) continue;
    try {
      const decoded = decodeUser(candidate);
      if (!decoded) continue;
      const refreshed = refreshUserIfNeeded(req, res, decoded);
      return { user: refreshed, token: candidate };
    } catch (_err) {
      // try next candidate
    }
  }

  return { user: null, token: null };
}

function authOptional(req, res, next) {
  try {
    const { user } = selectUserFromTokens(req, res);
    attachUser(req, user);
  } catch (_e) {
    attachUser(req, null);
  }
  next();
}

function authRequired(req, res, next) {
  try {
    const { user } = selectUserFromTokens(req, res);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    attachUser(req, user);
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

// Export compatível com ambos patterns:
//   - const auth = require('../middleware/auth')
//   - const { authRequired, authOptional } = require('../middleware/auth')
module.exports = authRequired;
module.exports.authRequired = authRequired;
module.exports.authOptional = authOptional;
module.exports.decodeUser = decodeUser;
module.exports.readToken = readToken;
module.exports.attachUser = attachUser;
module.exports.extractTokens = extractTokens;
module.exports.selectUserFromTokens = selectUserFromTokens;

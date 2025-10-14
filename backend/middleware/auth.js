// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Lê token de: Cookie (token|access_token), Authorization: Bearer, ou x-access-token
 */
function readToken(req) {
  const h = req.headers || {};
  const c = req.cookies || {};
  const auth = h.authorization || h.Authorization || '';
  const bearer = /^Bearer\s+(.+)$/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : null;
  return (
    (typeof c?.auth_token === 'string' && c.auth_token) ||
    (typeof c?.token === 'string' && c.token) ||
    (typeof c?.access_token === 'string' && c.access_token) ||
    (typeof h['x-access-token'] === 'string' && h['x-access-token']) ||
    bearer ||
    null
  );
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

function authOptional(req, _res, next) {
  try {
    const token = readToken(req);
    if (token) {
      const user = decodeUser(token);
      attachUser(req, user);
    } else {
      attachUser(req, null);
    }
  } catch (_e) {
    attachUser(req, null);
  }
  next();
}

function authRequired(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = decodeUser(token);
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

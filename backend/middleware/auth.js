// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function extractToken(req) {
  const h = req.headers || {};
  const c = req.cookies || {};
  const name = process.env.AUTH_COOKIE_NAME || 'token';

  // Preferir cookie quando o app usa cookies cross-site
  if (process.env.USE_COOKIE_AUTH === 'true' && typeof c[name] === 'string' && c[name]) {
    return c[name];
  }

  // Authorization: Bearer <token>
  const auth = h.authorization || h.Authorization;
  if (typeof auth === 'string') {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }

  // Header alternativo
  if (typeof h['x-access-token'] === 'string' && h['x-access-token']) {
    return h['x-access-token'];
  }

  return null;
}

function decodeUser(req) {
  const token = extractToken(req);
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;

  try {
    const payload = jwt.verify(token, secret);
    const id = payload?.sub || payload?.id || payload?._id;
    if (!id) return null;
    return {
      _id: String(id),
      role: payload?.role || payload?.type || 'user',
      payload,
    };
  } catch {
    return null;
  }
}

function authOptional(req, _res, next) {
  req.user = decodeUser(req);
  return next();
}

function authRequired(req, res, next) {
  const u = decodeUser(req);
  if (u) {
    req.user = u;
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
}

// Compat: este arquivo pode ser importado como função ou objeto
module.exports = Object.assign(authRequired, { authRequired, authOptional });

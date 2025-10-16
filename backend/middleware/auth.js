const jwt = require('jsonwebtoken');
const { AUTH_COOKIE } = require('../utils/cookies');
const { maybeRefreshSession } = require('../utils/sessionToken');

function extractBearer(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match && match[1] ? match[1].trim() : null;
}

function extractToken(req) {
  const bearer = extractBearer(req);
  if (bearer) return bearer;
  const cookieToken = req?.cookies?.[AUTH_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken) {
    return cookieToken;
  }
  return null;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }
  const decoded = jwt.verify(token, secret);
  if (!decoded || typeof decoded !== 'object') {
    return null;
  }
  const id = decoded.sub || decoded.id || decoded._id;
  return {
    ...decoded,
    id: id ? String(id) : undefined,
    _id: id ? String(id) : undefined,
  };
}

function attachUser(req, user) {
  req.user = user || null;
  if (user?.role && !req.profile) {
    req.profile = user.role;
  }
  if (req.res?.locals) {
    req.res.locals.user = req.user;
  }
}

function applyRefresh(req, res, user) {
  if (!user) return user;
  try {
    const refreshed = maybeRefreshSession(req, res, user);
    if (!refreshed) return user;
    return verifyToken(refreshed) || user;
  } catch {
    return user;
  }
}

function makeAuth(required) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
      if (required) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      attachUser(req, null);
      return next();
    }

    try {
      let user = verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      user = applyRefresh(req, res, user);
      attachUser(req, user);
      return next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

const authRequired = makeAuth(true);
const authOptional = makeAuth(false);

module.exports = authRequired;
module.exports.authRequired = authRequired;
module.exports.authOptional = authOptional;
module.exports.attachUser = attachUser;
module.exports.extractToken = extractToken;

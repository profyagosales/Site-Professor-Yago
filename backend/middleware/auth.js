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

function normalizeUser(user) {
  if (!user) return null;
  const id = user.sub || user.id || user._id;
  if (!id) return { ...user };
  return {
    ...user,
    id: String(id),
    _id: String(id),
    sub: user.sub ?? String(id),
  };
}

function deriveRole(user) {
  const role = user?.role ?? user?.profile;
  return typeof role === 'string' ? role : undefined;
}

function buildAuthState(user) {
  if (!user) return null;
  const id = user.sub || user.id || user._id;
  if (!id) return null;
  const auth = {
    sub: String(id),
    userId: String(id),
  };
  const role = deriveRole(user);
  if (role) auth.role = role;
  if (user.scope) auth.scope = user.scope;
  if (user.scopes) auth.scopes = user.scopes;
  return auth;
}

function attachUser(req, user) {
  const normalized = normalizeUser(user);
  req.user = normalized || null;
  if (normalized?.role && !req.profile) {
    req.profile = normalized.role;
  }
  if (req.res?.locals) {
    req.res.locals.user = req.user;
  }
}

function attachAuth(req, user) {
  const authState = buildAuthState(user);
  req.auth = authState;
  if (req.res?.locals) {
    req.res.locals.auth = authState || null;
  }
  if (authState) {
    const enrichedUser = {
      ...user,
      role: authState.role ?? deriveRole(user),
      id: authState.userId,
      _id: authState.userId,
      sub: authState.sub,
    };
    attachUser(req, enrichedUser);
  } else {
    attachUser(req, null);
  }
  return authState;
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

function selectUserFromTokens(req, res) {
  const token = extractToken(req);
  if (!token) {
    return { token: null, user: null };
  }
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return { token, user: null };
    }
    const maybeRefreshed = applyRefresh(req, res, decoded);
    return { token, user: maybeRefreshed || decoded };
  } catch {
    return { token, user: null };
  }
}

function authOptional(req, res, next) {
  attachAuth(req, null);
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return next();
    }
    const user = applyRefresh(req, res, decoded);
    attachAuth(req, user);
  } catch {
    // requisição segue sem autenticação
  }
  return next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.auth) {
      console.warn('[auth] 401 authRequired', {
        path: req.originalUrl,
        method: req.method,
        role: req.user?.role ?? req.auth?.role ?? null,
        user: req.user?._id ?? req.user?.id ?? req.auth?.sub ?? req.auth?.userId ?? null,
      });
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return next();
  });
}

module.exports = authRequired;
module.exports.authRequired = authRequired;
module.exports.authOptional = authOptional;
module.exports.attachUser = attachUser;
module.exports.extractToken = extractToken;
module.exports.selectUserFromTokens = selectUserFromTokens;

const jwt = require('jsonwebtoken');
const authMod = require('./auth');
const ensureTeacher = require('./ensureTeacher');

const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;

module.exports = function authFileOrTeacher(req, res, next) {
  const rawQueryToken =
    (typeof req.query?.['file-token'] === 'string' && req.query['file-token']) ||
    (typeof req.query?.file_token === 'string' && req.query.file_token) ||
    null;

  const rawHeaderToken =
    (typeof req.headers?.['x-file-token'] === 'string' && req.headers['x-file-token']) || null;

  const legacyToken =
    (typeof req.query?.token === 'string' && req.query.token) || null;

  const rawToken = rawQueryToken || rawHeaderToken || legacyToken;
  const hasSessionCookie = Boolean(req.headers?.cookie);
  const hasAuthHeader = Boolean(req.headers?.authorization) || Boolean(req.headers?.['x-access-token']);
  const hasSession = hasSessionCookie || hasAuthHeader;

  if (rawToken) {
    const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth:file-or-teacher] FILE_TOKEN_SECRET ausente');
      return res.status(500).json({ success: false, message: 'Configuração inválida do servidor' });
    }
    try {
      const decoded = jwt.verify(rawToken, secret);
      const payload = decoded && typeof decoded === 'object' ? decoded : null;
      const teacherId =
        payload?.sub || payload?.teacherId || payload?.userId || payload?.id || null;

      req.fileTokenRaw = rawToken;
      req.fileTokenPayload = payload;

      req.auth = {
        role: 'teacher',
        userId: teacherId ? String(teacherId) : undefined,
      };

      req.user = teacherId
        ? { _id: String(teacherId), id: String(teacherId), role: 'teacher' }
        : { role: 'teacher' };

      return next();
    } catch (err) {
      console.warn('[auth:file-or-teacher] invalid token', {
        path: req.originalUrl,
        method: req.method,
        reason: err?.message || String(err),
      });
      if (!hasSession) {
        return res.status(401).json({ success: false, message: 'Invalid or expired file token' });
      }
      return authRequired(req, res, () => ensureTeacher(req, res, next));
    }
  }

  if (!hasSession) {
    return res.status(401).json({ success: false, message: 'Invalid or expired file token' });
  }

  return authRequired(req, res, () => ensureTeacher(req, res, next));
};

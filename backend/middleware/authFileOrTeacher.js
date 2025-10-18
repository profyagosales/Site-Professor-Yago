const jwt = require('jsonwebtoken');
const authMod = require('./auth');
const ensureTeacher = require('./ensureTeacher');

const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;

module.exports = function authFileOrTeacher(req, res, next) {
  const rawToken =
    (typeof req.query?.['file-token'] === 'string' && req.query['file-token']) ||
    (typeof req.query?.token === 'string' && req.query.token) ||
    (typeof req.headers?.['x-file-token'] === 'string' && req.headers['x-file-token']) ||
    null;

  if (rawToken) {
    const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth:file-or-teacher] FILE_TOKEN_SECRET ausente');
      return res.status(500).json({ success: false, message: 'Configuração inválida do servidor' });
    }
    try {
      const decoded = jwt.verify(rawToken, secret);
      req.fileTokenRaw = rawToken;
      req.fileTokenPayload = decoded && typeof decoded === 'object' ? decoded : null;

      const teacherId = req.fileTokenPayload?.sub || req.fileTokenPayload?.teacherId || req.fileTokenPayload?.userId;

      req.auth = {
        ...(req.auth || {}),
        role: 'teacher',
        sub: teacherId ? String(teacherId) : undefined,
        userId: teacherId ? String(teacherId) : undefined,
        scopes: req.auth?.scopes,
      };

      if (!req.user) {
        req.user = teacherId
          ? { _id: String(teacherId), id: String(teacherId), role: 'teacher' }
          : { role: 'teacher' };
      } else {
        req.user.role = req.user.role || 'teacher';
        if (!req.user._id && teacherId) {
          req.user._id = String(teacherId);
          req.user.id = String(teacherId);
        }
      }

      return next();
    } catch (err) {
      console.warn('[auth:file-or-teacher] invalid token', {
        path: req.originalUrl,
        method: req.method,
        reason: err?.message || String(err),
      });
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
    }
  }

  return authRequired(req, res, () => ensureTeacher(req, res, next));
};

const jwt = require('jsonwebtoken');

module.exports = function fileTokenCompat(req, _res, next) {
  const q = req.query || {};
  const raw =
    q['file-token'] ||
    q['token'] ||
    req.get('x-file-token');

  req.fileToken = raw || null;
  req.fileTokenPayload = null;

  const dbg = process.env.DEBUG_FILE_TOKEN === '1';
  if (!raw) {
    if (dbg) console.log('[file-token] none on', req.method, req.originalUrl);
    return next();
  }

  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
  try {
    const payload = jwt.verify(String(raw), secret);
    req.fileTokenPayload = payload;
    if (dbg) console.log('[file-token] ok:', { essayId: payload.essayId, sub: payload.sub });
  } catch (e) {
    if (dbg) console.warn('[file-token] invalid:', e.message);
  }
  return next();
};


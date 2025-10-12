const jwt = require('jsonwebtoken');

module.exports = function fileTokenCompat(req, _res, next) {
  const q = req.query || {};
  const h = req.headers || {};
  const raw =
    (typeof q['file-token'] === 'string' && q['file-token']) ||
    (typeof q.token === 'string' && q.token) ||
    (typeof h['x-file-token'] === 'string' && h['x-file-token']) ||
    null;

  req.fileToken = raw || null;
  req.fileTokenPayload = null;

  if (raw) {
    const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
    if (secret) {
      try {
        const dec = jwt.verify(raw, secret);
        req.fileTokenPayload = dec && typeof dec === 'object' ? dec : null;
        if (process.env.DEBUG_FILE_TOKEN === '1') {
          console.log('[file-token] ok', { essayId: dec?.essayId, sub: dec?.sub });
        }
      } catch (e) {
        if (process.env.DEBUG_FILE_TOKEN === '1') console.warn('[file-token] invalid', e.message);
      }
    }
  } else {
    if (process.env.DEBUG_FILE_TOKEN === '1') console.log('[file-token] none on', req.method, req.originalUrl);
  }
  next();
};


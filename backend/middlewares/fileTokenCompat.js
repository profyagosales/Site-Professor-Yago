const jwt = require('jsonwebtoken');

// Compat: aceita ?file-token= ou ?token= e injeta no request
module.exports = function fileTokenCompat(req, _res, next) {
  const q = req.query || {};
  const token =
    q['file-token'] ||
    q.fileToken ||
    q.token ||
    req.get('x-file-token');
  if (token) {
    const dbg = process.env.DEBUG_FILE_TOKEN === '1';
    req.fileToken = String(token);
    const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      if (dbg) console.warn('[file-token] segredo ausente para validar token curto');
    } else {
      try {
        req.fileTokenPayload = jwt.verify(req.fileToken, secret);
        if (dbg) console.log('[file-token] payload decodificada no middleware');
      } catch (err) {
        if (dbg) console.warn('[file-token] token inválido no middleware', err?.message);
      }
    }
  }
  next();
};


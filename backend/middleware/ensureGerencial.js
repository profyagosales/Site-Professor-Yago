const jwt = require('jsonwebtoken');

function readBearerToken(req) {
  const headers = req.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  return null;
}

module.exports = function ensureGerencial(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Gerencial token ausente.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[ensureGerencial] JWT_SECRET ausente.');
      return res.status(500).json({ success: false, message: 'Configuração inválida do servidor.' });
    }

    const payload = jwt.verify(token, secret);
    if (!payload || typeof payload !== 'object' || payload.role !== 'gerencial') {
      return res.status(401).json({ success: false, message: 'Gerencial token inválido.' });
    }

    req.gerencial = {
      role: 'gerencial',
      id: payload.sub || payload.id || null,
      token,
      exp: payload.exp || null,
    };

    return next();
  } catch (err) {
    console.warn('[ensureGerencial] token inválido ou expirado', err && err.message);
    return res.status(401).json({ success: false, message: 'Gerencial token inválido.' });
  }
};

const { selectUserFromTokens } = require('./auth');

module.exports = function ensureGerencial(req, res, next) {
  try {
    const { token, user } = selectUserFromTokens(req, res);
    if (!token || !user) {
      return res.status(401).json({ success: false, message: 'Gerencial token ausente.' });
    }

    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    if (role !== 'gerencial') {
      return res.status(401).json({ success: false, message: 'Gerencial token inválido.' });
    }

    req.gerencial = {
      role: 'gerencial',
      id: user.sub || user.id || user._id || null,
      token,
      exp: user.exp || null,
      scope: user.scope || null,
    };

    return next();
  } catch (err) {
    console.warn('[ensureGerencial] token inválido ou expirado', err && err.message);
    return res.status(401).json({ success: false, message: 'Gerencial token inválido.' });
  }
};

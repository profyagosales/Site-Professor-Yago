const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const token =
      req.cookies?.session ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
}

module.exports = { authRequired };


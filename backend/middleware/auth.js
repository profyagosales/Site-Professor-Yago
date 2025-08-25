const jwt = require('jsonwebtoken');

module.exports = function authRequired(req, res, next) {
  try {
    const cookieToken = req.cookies?.token;
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;

    const token = cookieToken || bearer;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
};

const jwt = require('jsonwebtoken');

function handler(req, res, next) {
  try {
    // 1) cookie httpOnly
    const cookieToken = req.cookies?.token;
    // 2) header Bearer (compat)
    const header = req.headers.authorization || '';
    const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;

    const token = cookieToken || headerToken;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
}

module.exports = (...args) => {
  if (args.length === 0 || typeof args[0] === 'string') return handler; // auth() or auth('role')
  return handler(...args);
};



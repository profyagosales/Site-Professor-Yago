const jwt = require('jsonwebtoken');

function handler(req, res, next) {
  const token = req.cookies?.token || (req.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ message: 'Unauthenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = function (...args) {
  if (args.length === 0 || typeof args[0] === 'string') return handler; // auth() or auth('role')
  return handler(...args);
};



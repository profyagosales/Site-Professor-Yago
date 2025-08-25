const jwt = require('jsonwebtoken');

function authCore(req, res, next) {
  try {
    const cookieToken = req.cookies?.token;
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const token = cookieToken || bearer;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    req.user._id = req.user._id || req.user.id || req.user.sub;
    req.profile = req.user.role || 'student';
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
}

// Suporta:
// - router.use(authRequired)  ✅
// - router.use(authRequired()) ✅
module.exports = function authRequired(...args) {
  if (args.length === 0) return authCore; // chamado como factory
  return authCore(...args);               // usado direto como middleware
};
module.exports.authCore = authCore;

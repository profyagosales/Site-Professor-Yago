function ensureStudent(req, res, next) {
  const role = req.auth?.role ?? req.user?.role;
  if (typeof role === 'string' && role.toLowerCase() === 'student') {
    return next();
  }

  return res.status(403).json({ success: false, message: 'forbidden: student role required' });
}

module.exports = ensureStudent;

module.exports = function ensureTeacher(req, res, next) {
  if (!req?.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const role = (req.user.role || req.user.profile || '').toString().toLowerCase();
  if (role === 'teacher' || role === 'admin') {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Acesso restrito aos professores.' });
};

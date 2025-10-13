module.exports = function ensureTeacher(req, res, next) {
  const role = (req?.user?.role || '').toString().toLowerCase();
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Acesso restrito aos professores.' });
  }
  return next();
};

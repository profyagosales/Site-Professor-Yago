module.exports = function fileTokenCompat(req, res, next) {
  // Normaliza query: aceita ?file-token=... ou ?token=... e expõe em req.query.token
  const q = req.query || {};
  if (!q.token && q['file-token']) req.query.token = q['file-token'];
  next();
};

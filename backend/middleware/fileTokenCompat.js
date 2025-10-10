module.exports = function fileTokenCompat(req, res, next) {
  const q = req.query || {};
  const token = q.token || q['file-token'];
  if (token && !req.get('Authorization')) {
    req.headers.authorization = `Bearer ${token}`;
  }
  next();
};

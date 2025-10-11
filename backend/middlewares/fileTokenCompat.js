// Compat: aceita ?file-token= ou ?token= e injeta no request
module.exports = function fileTokenCompat(req, _res, next) {
  const q = req.query || {};
  const token =
    q['file-token'] ||
    q.fileToken ||
    q.token ||
    req.get('x-file-token');
  if (token) {
    // não sobrescreva cabeçalhos; apenas anexe ao req
    req.fileToken = String(token);
  }
  next();
};


module.exports = function fileTokenCompat(req, _res, next) {
  const t = req.query['file-token'] || req.query.token;
  if (t && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${t}`;
  }
  next();
};
const r = require('express').Router();
// GET /api/professor/turmas => /api/professor/classes (mesma query)
r.get('/turmas', (req, res, next) => {
  const q = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  req.url = '/classes' + q;
  next();
});
module.exports = r;

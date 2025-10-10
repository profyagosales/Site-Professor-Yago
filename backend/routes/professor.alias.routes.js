const express = require('express');
const router = express.Router();

const passthru = (req, _res, next) => {
  req.url = req.url.replace(/^\/turmas\b/, '/classes');
  next();
};

router.use('/turmas', passthru);

module.exports = router;

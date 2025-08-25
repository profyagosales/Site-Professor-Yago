const express = require('express');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(
  authRequired,
  (req, res) => {
    res.status(410).json({
      success: false,
      message: 'Endpoint /students descontinuado. Utilize /classes/:id/students',
      data: null,
    });
  }
);

module.exports = router;

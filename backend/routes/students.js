const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(
  auth(),
  (req, res) => {
    res.status(410).json({
      success: false,
      message: 'Endpoint /students descontinuado. Utilize /classes/:id/students',
      data: null,
    });
  }
);

module.exports = router;

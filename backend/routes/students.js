const express = require('express');

const router = express.Router();

router.use((req, res) => {
  res.status(410).json({
    success: false,
    message: 'Endpoint /students descontinuado. Utilize /classes/:id/students',
    data: null,
  });
});

module.exports = router;

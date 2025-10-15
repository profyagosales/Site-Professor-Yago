const express = require('express');
const router = express.Router();
router.post(['/', '/send'], (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Esta rota foi substituída. Utilize POST /api/classes/email-bulk.',
  });
});

module.exports = router;

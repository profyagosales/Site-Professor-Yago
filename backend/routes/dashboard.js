const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth('teacher'), async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard do professor',
      data: { upcomingEvaluations: [], schedule: [], contentProgress: [] }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/teacher', auth('teacher'), async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard do professor',
      data: { upcomingEvaluations: [], schedule: [], contentProgress: [] }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

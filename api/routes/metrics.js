const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authRequired } = require('../middleware/auth');

// GET /metrics/summary - resumo agregado (apenas professor)
router.get('/summary', authRequired(['teacher']), metricsController.getSummary);

module.exports = router;

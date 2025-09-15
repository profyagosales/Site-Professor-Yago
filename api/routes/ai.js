const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authRequired } = require('../middleware/auth');
const aiRateLimit = require('../middleware/aiRateLimit');

// POST /ai/correction-suggestion
router.post('/correction-suggestion', authRequired(['teacher']), aiRateLimit, aiController.correctionSuggestion);

module.exports = router;

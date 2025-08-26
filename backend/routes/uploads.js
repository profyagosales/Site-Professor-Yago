const express = require('express');
const authRequired = require('../middleware/auth');
const { upload, uploadEssay } = require('../controllers/uploadsController');

const router = express.Router();

router.post('/essay', authRequired, upload.single('file'), uploadEssay);

module.exports = router;

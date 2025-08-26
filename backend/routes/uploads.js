const express = require('express');
const authRequired = require('../middleware/auth');
const { upload, uploadEssay, cloudStatus } = require('../controllers/uploadsController');

const router = express.Router();

router.post('/essay', authRequired, (req, res, next) => {
	upload.single('file')(req, res, function (err) {
		if (err && err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ success: false, message: 'Arquivo muito grande (máx 20MB)' });
		}
		return uploadEssay(req, res, next);
	});
});

router.get('/status', (req, res) => cloudStatus(req, res));

module.exports = router;

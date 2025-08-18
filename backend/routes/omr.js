const express = require('express');
const auth = require('../middleware/auth');
const { upload, processOMR } = require('../controllers/omrController');

const router = express.Router();

router.use(auth);
router.post('/grade', upload.single('pdf'), processOMR);

module.exports = router;

const express = require('express');
const { authRequired } = require('../middleware/auth');
const { upload, processOMR } = require('../controllers/omrController');

const router = express.Router();

router.use(authRequired);
router.post('/grade', upload.single('pdf'), processOMR);

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const { upload, enviarRedacao } = require('../controllers/redacoesController');

const router = express.Router();

router.use(auth);
router.post('/enviar', upload.single('file'), enviarRedacao);

module.exports = router;

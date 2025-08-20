const express = require('express');
const auth = require('../middleware/auth');
const { upload, enviarRedacao, listarRedacoes, corrigirRedacao } = require('../controllers/redacoesController');

const router = express.Router();

router.use(auth());
router.post('/enviar', upload.single('file'), enviarRedacao);
router.get('/professor', listarRedacoes);
router.post('/:id/corrigir', corrigirRedacao);

module.exports = router;

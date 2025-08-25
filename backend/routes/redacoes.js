const express = require('express');
const { authRequired } = require('../middleware/auth');
const { upload, enviarRedacao, listarRedacoes, corrigirRedacao } = require('../controllers/redacoesController');

const router = express.Router();

router.use(authRequired);
router.post('/enviar', upload.single('file'), enviarRedacao);
router.get('/professor', listarRedacoes);
router.post('/:id/corrigir', corrigirRedacao);

module.exports = router;

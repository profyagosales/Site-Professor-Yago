const express = require('express');
const router = express.Router();
const uploadsController = require('../controllers/uploadsController');
const { authRequired } = require('../middleware/auth');
const multer = require('multer');

// Configuração do multer para upload temporário
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Rota para upload de arquivos de redação
router.post('/essay', 
  authRequired(['teacher', 'student']), 
  upload.single('file'),
  uploadsController.uploadEssay
);

module.exports = router;

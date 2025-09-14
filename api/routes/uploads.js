const express = require('express');
const router = express.Router();
const uploadsController = require('../controllers/uploadsController');
const { authRequired } = require('../middleware/auth');
const multer = require('multer');

// Configuração do multer para upload temporário
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas PDF é permitido')); 
    }
    cb(null, true);
  }
});

// Rota para upload de arquivos de redação
router.post('/essay', 
  authRequired(['teacher', 'student']), 
  upload.single('file'),
  uploadsController.uploadEssay
);

module.exports = router;

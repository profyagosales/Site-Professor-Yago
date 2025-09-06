const express = require('express');
const router = express.Router();
const essaysController = require('../controllers/essaysController');
const { authRequired } = require('../middleware/auth');

// Rotas para redações
router.get('/', authRequired(['teacher', 'student']), essaysController.getEssays);
router.post('/', authRequired(['teacher', 'student']), essaysController.createEssay);
router.get('/:id', authRequired(['teacher', 'student']), essaysController.getEssayById);
router.put('/:id', authRequired(['teacher']), essaysController.updateEssay);

// Rotas para acesso ao arquivo
router.post('/:id/file-token', authRequired(['teacher', 'student']), essaysController.generateFileToken);
router.get('/:id/file', essaysController.getEssayFile); // Verificação de token ocorre no controller
router.head('/:id/file', essaysController.getEssayFileHead); // Verificação de token ocorre no controller

// Rotas para anotações
router.get('/:id/annotations', authRequired(['teacher', 'student']), essaysController.getAnnotations);
router.put('/:id/annotations', authRequired(['teacher']), essaysController.updateAnnotations);

// Rotas para nota/espelho
router.put('/:id/grade', authRequired(['teacher']), essaysController.gradeEssay);

// Rotas para PDF corrigido e e-mail
router.post('/:id/export', authRequired(['teacher']), essaysController.exportCorrectedPdf);
router.post('/:id/send-email', authRequired(['teacher']), essaysController.sendEmailWithPdf);

module.exports = router;

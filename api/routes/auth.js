const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Rotas públicas de autenticação
router.post('/login/teacher', authController.loginTeacher);
router.post('/login/student', authController.loginStudent);
router.post('/logout', authController.logout);

// Rota protegida para obter o perfil do usuário
router.get('/me', authRequired(), authController.getMe);

module.exports = router;

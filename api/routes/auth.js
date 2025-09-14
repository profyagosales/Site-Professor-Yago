const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Rotas públicas de autenticação
router.post('/login/teacher', authController.loginTeacher);
router.post('/login/student', authController.loginStudent);
router.post('/logout', authController.logout);

// Rota de teste sem autenticação
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Rota de teste funcionando!', 
    cookies: req.cookies, 
    headers: req.headers 
  });
});

// Rota protegida para obter o perfil do usuário
router.get('/me', authRequired(), authController.getMe);

// Rota de teste sem autenticação para diagnóstico
router.get('/me-test', (req, res) => {
  res.json({ 
    message: 'Rota me-test funcionando sem autenticação',
    timestamp: new Date().toISOString(),
    cookies: req.cookies || 'Nenhum cookie',
    headers: req.headers
  });
});

// Rota para teste de cookie
router.get('/cookie-test', (req, res) => {
  // Definir um cookie de teste
  const { getAuthCookieOptions } = require('../utils/cookieUtils');
  const options = getAuthCookieOptions();
  
  console.log('Definindo cookie de teste com opções:', options);
  res.cookie('test_cookie', 'teste_valor_' + Date.now(), options);
  
  res.json({
    message: 'Cookie de teste definido',
    cookieOptions: options,
    cookiePresent: req.cookies || {},
    useSecure: process.env.NODE_ENV === 'production',
    useSameSiteNone: process.env.NODE_ENV === 'production',
    timestamp: new Date().toISOString()
  });
});

// Rota de debug de sessão (não autentica, só inspeciona cookie)
router.get('/debug-session', authController.debugSession);

// Rota de diagnóstico para manipular cookies manualmente
router.get('/set-test-cookie', (req, res) => {
  res.cookie('test_cookie', 'valor_teste', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000 // 10 minutos
  });
  res.json({ message: 'Cookie de teste definido' });
});

module.exports = router;

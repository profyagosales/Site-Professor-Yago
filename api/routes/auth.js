const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Rotas públicas de autenticação
router.post('/login/teacher', authController.loginTeacher);
router.post('/login/teacher-dry-run', authController.loginTeacherDryRun);
router.post('/login/student', authController.loginStudent);
router.post('/logout', authController.logout);
const diagnosticsEnabled = process.env.DIAGNOSTICS_ENABLED === 'true';
// Health de autenticação (sempre exposto, não sensível)
router.get('/health', authController.authHealth);
if (diagnosticsEnabled) {
  // Diagnóstico de usuário
  router.get('/diagnose-user', authController.diagnoseUser);
  // Opções de cookie atuais
  router.get('/cookie-options', authController.cookieOptions);
  router.get('/set-cookie-variants', authController.setCookieVariants);
}

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

if (diagnosticsEnabled) {
  // Rota de teste sem autenticação para diagnóstico
  router.get('/me-test', (req, res) => {
    res.json({ 
      message: 'Rota me-test funcionando sem autenticação',
      timestamp: new Date().toISOString(),
      cookies: req.cookies || 'Nenhum cookie',
      headers: req.headers
    });
  });
}

if (diagnosticsEnabled) {
  // Rota para teste de cookie
  router.get('/cookie-test', (req, res) => {
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

  // Rota de debug de sessão
  router.get('/debug-session', authController.debugSession);

  // Rota para set raw cookie manual
  router.get('/set-raw-cookie', authController.setRawCookie);

  // Rota de diagnóstico simples
  router.get('/set-test-cookie', (req, res) => {
    res.cookie('test_cookie', 'valor_teste', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000
    });
    res.json({ message: 'Cookie de teste definido' });
  });
}

module.exports = router;

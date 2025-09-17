const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Rotas públicas de autenticação
router.post('/login/teacher', authController.loginTeacher);
// Dry-run apenas quando diagnóstico habilitado
if (process.env.DIAGNOSTICS_ENABLED === 'true') {
  router.post('/login/teacher-dry-run', authController.loginTeacherDryRun);
}
router.post('/login/student', authController.loginStudent);
router.post('/logout', authController.logout);
router.get('/status', authController.status);
const diagnosticsEnabled = process.env.DIAGNOSTICS_ENABLED === 'true';
// Health de autenticação (sempre exposto, não sensível)
router.get('/health', authController.authHealth);
if (diagnosticsEnabled) {
  router.get('/diagnose-user', authController.diagnoseUser);
  router.get('/cookie-options', authController.cookieOptions);
  router.get('/set-cookie-variants', authController.setCookieVariants);
}

// Rota de teste removida em produção (não essencial)
if (diagnosticsEnabled) {
  router.get('/test', (req, res) => {
    res.json({ 
      message: 'Rota de teste funcionando!', 
      cookies: req.cookies, 
      headers: req.headers 
    });
  });
}

// Rota protegida para obter o perfil do usuário
router.get('/me', authRequired(), authController.getMe);

if (diagnosticsEnabled) {
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
  router.get('/debug-session', authController.debugSession);
  router.get('/set-raw-cookie', authController.setRawCookie);
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

/**
 * Utilitários de diagnóstico para autenticação
 * 
 * Este arquivo contém rotas especiais para ajudar a diagnosticar problemas
 * relacionados a autenticação, CORS e cookies.
 */

const express = require('express');
const router = express.Router();
const { getAuthCookieOptions } = require('../utils/cookieUtils');

// Informações detalhadas do ambiente
router.get('/environment', (req, res) => {
  res.json({
    environment: {
      node_env: process.env.NODE_ENV,
      use_cookie_auth: process.env.USE_COOKIE_AUTH,
      allowed_origins: process.env.ALLOWED_ORIGINS,
      jwt_expiration: process.env.JWT_EXPIRATION,
      port: process.env.PORT
    }
  });
});

// Teste de CORS
router.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS está funcionando corretamente!',
    origin: req.headers.origin || 'Nenhuma origem detectada',
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
    }
  });
});

// Teste de cookies detalhado
router.get('/cookie-diagnostic', (req, res) => {
  const options = getAuthCookieOptions();
  const testCookieName = 'diagnostic_cookie';
  const testCookieValue = 'test_' + Date.now();
  
  // Define um cookie de diagnóstico
  res.cookie(testCookieName, testCookieValue, options);
  
  res.json({
    status: 'success',
    cookieOptions: options,
    cookieDefined: {
      name: testCookieName,
      value: testCookieValue
    },
    existingCookies: req.cookies || {},
    sameSiteContext: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secureContext: process.env.NODE_ENV === 'production',
    requestHeaders: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
      cookie: req.headers.cookie
    },
    timestamp: new Date().toISOString()
  });
});

// Teste de autenticação falso para definir um cookie JWT válido
router.get('/set-test-token', (req, res) => {
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  const { getAuthCookieOptions } = require('../utils/cookieUtils');
  
  // Cria um token JWT de teste para diagnóstico
  const testToken = jwt.sign(
    { sub: 'test-user-id', role: 'test' },
    config.jwtSecret,
    { expiresIn: '10m' } // Curta duração para teste
  );
  
  // Define o cookie com o token de teste
  res.cookie('auth_token', testToken, getAuthCookieOptions());
  
  res.json({
    message: 'Token de teste definido com sucesso!',
    token: {
      value: testToken.substring(0, 10) + '...',
      expiresIn: '10 minutos'
    },
    cookieOptions: getAuthCookieOptions(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

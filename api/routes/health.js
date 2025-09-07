const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString() 
  });
});

// Diagnóstico completo
router.get('/diagnostic', async (req, res) => {
  try {
    // Verificar o estado dos cookies
    const cookies = req.cookies || {};
    const headers = req.headers || {};

    // Informações de configuração
    const config = require('../config');

    // Variáveis de ambiente importantes
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'não definido',
      PORT: process.env.PORT || 'não definido',
      USE_COOKIE_AUTH: process.env.USE_COOKIE_AUTH || 'não definido',
      API_PREFIX: process.env.API_PREFIX || 'não definido',
      APP_DOMAIN: process.env.APP_DOMAIN || 'não definido',
      FRONTEND_URL: process.env.FRONTEND_URL || 'não definido',
    };

    // Montar resposta
    res.json({
      status: 'Diagnóstico completo',
      timestamp: new Date().toISOString(),
      cookies,
      headers: {
        userAgent: headers['user-agent'],
        origin: headers.origin,
        host: headers.host,
        referer: headers.referer,
        authorization: headers.authorization ? 'presente' : 'ausente'
      },
      config: {
        jwtSecret: config.jwtSecret ? 'configurado' : 'não configurado',
        jwtExpiration: config.jwtExpiration,
        mongoUri: config.mongoUri ? 'configurado' : 'não configurado',
        port: config.port,
        corsEnabled: !!config.corsOptions,
        corsCredentials: config.corsOptions && config.corsOptions.credentials === true
      },
      environment: envVars
    });
  } catch (error) {
    res.status(500).json({
      status: 'erro',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

module.exports = router;

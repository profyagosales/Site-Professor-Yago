const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// Tentar importar cookie-parser de forma segura para não quebrar a inicialização
let cookieParser;
try {
  cookieParser = require('cookie-parser');
} catch (err) {
  console.warn('Cookie-parser não encontrado. Autenticação por cookie não estará disponível.');
  cookieParser = () => (req, res, next) => next(); // Mock function
}
const errorHandler = require('./middleware/errorHandler');
const config = require('./config');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const themesRoutes = require('./routes/themes');
const essaysRoutes = require('./routes/essays');
const uploadsRoutes = require('./routes/uploads');

const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(cookieParser());

// Get API prefix from environment variable or use empty string
// Necessário para ambientes como o Render que podem adicionar prefixos
const apiPrefix = process.env.API_PREFIX || '';
console.log(`Usando prefixo de API: '${apiPrefix}'`);

// Rota de diagnóstico direta que não depende do banco de dados
app.get('/', (req, res) => {
  res.json({
    status: 'API está funcionando',
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: apiPrefix,
    cookieAuthEnabled: process.env.USE_COOKIE_AUTH === 'true',
    mongoUri: config.mongoUri ? 'Configurado' : 'Não configurado',
    corsOrigins: config.corsOptions.origin.toString(),
    timestamp: new Date().toISOString(),
    envVars: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      APP_DOMAIN: process.env.APP_DOMAIN,
      FRONTEND_URL: process.env.FRONTEND_URL,
      API_PREFIX: process.env.API_PREFIX,
      USE_COOKIE_AUTH: process.env.USE_COOKIE_AUTH
    }
  });
});

// Rota de diagnóstico para verificar cookies e headers
app.get('/debug', (req, res) => {
  res.json({
    cookies: req.cookies || 'Nenhum cookie',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/themes`, themesRoutes);
app.use(`${apiPrefix}/essays`, essaysRoutes);
app.use(`${apiPrefix}/uploads`, uploadsRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;

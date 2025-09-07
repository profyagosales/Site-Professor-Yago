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
const apiPrefix = process.env.API_PREFIX || '';

// Rota de diagnóstico direta que não depende do banco de dados
app.get('/', (req, res) => {
  res.json({
    status: 'API está funcionando',
    environment: process.env.NODE_ENV || 'development',
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

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer'); // Importar multer
const errorHandler = require('./middleware/errorHandler');
const requestDebugger = require('./middleware/requestDebugger');
const config = require('./config');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const themesRoutes = require('./routes/themes');
const essaysRoutes = require('./routes/essays');
const uploadsRoutes = require('./routes/uploads');
const setupRoutes = require('./routes/setup'); // Rota temporária para configuração
const diagnosticsRoutes = require('./routes/diagnostics'); // Rotas de diagnóstico
const studentsRoutes = require('./routes/students'); // Rotas para gerenciamento de alunos
const classesRoutes = require('./routes/classes'); // Rotas para gerenciamento de turmas

const app = express();

// Configuração do Multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(requestDebugger); // Adicionar middleware de debug

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
    corsOrigins: typeof config.corsOptions.origin === 'function' ? 'Função dinâmica' : config.corsOptions.origin.toString(),
    corsCredentials: config.corsOptions.credentials === true ? 'Habilitado' : 'Desabilitado',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      `${apiPrefix}/auth/login/teacher`,
      `${apiPrefix}/auth/login/student`,
      `${apiPrefix}/auth/me`,
      `${apiPrefix}/auth/me-test`,
      `${apiPrefix}/auth/test`,
      `${apiPrefix}/auth/set-test-cookie`,
      `${apiPrefix}/health`,
      `${apiPrefix}/setup/create-teacher`,
      `${apiPrefix}/diagnostics/cors-test`,
      `${apiPrefix}/diagnostics/cookie-diagnostic`,
      `${apiPrefix}/diagnostics/environment`,
      `${apiPrefix}/diagnostics/set-test-token`,
      `${apiPrefix}/students`
    ],
    envVars: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      APP_DOMAIN: process.env.APP_DOMAIN,
      FRONTEND_URL: process.env.FRONTEND_URL,
      API_PREFIX: process.env.API_PREFIX,
      USE_COOKIE_AUTH: process.env.USE_COOKIE_AUTH
    },
    cookies: req.cookies || {},
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin'],
      'host': req.headers['host'],
      'referer': req.headers['referer']
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
// Aplicar multer apenas nas rotas de 'essays' que precisam de upload
app.use(`${apiPrefix}/essays`, upload.single('file'), essaysRoutes);
app.use(`${apiPrefix}/uploads`, uploadsRoutes);
app.use(`${apiPrefix}/setup`, setupRoutes); // Rota temporária para configuração inicial
app.use(`${apiPrefix}/diagnostics`, diagnosticsRoutes); // Rotas para diagnóstico de problemas
app.use(`${apiPrefix}/students`, studentsRoutes); // Rotas para gerenciar alunos
app.use(`${apiPrefix}/classes`, classesRoutes); // Rotas para gerenciar turmas

// Error handler
app.use(errorHandler);

module.exports = app;

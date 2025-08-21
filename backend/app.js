// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const classesRoutes = require('./routes/classes');
const studentsRoutes = require('./routes/students');
const evaluationRoutes = require('./routes/evaluations');
const gradesRoutes = require('./routes/grades');
const cadernoRoutes = require('./routes/caderno');
const gabaritoRoutes = require('./routes/gabaritos');
const omrRoutes = require('./routes/omr');
const redacoesRoutes = require('./routes/redacoes');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Aceitar produção + localhost 5173
const allowList = [
  process.env.APP_DOMAIN && process.env.APP_DOMAIN.trim(), // ex.: https://www.professoryagosales.com.br
  'http://localhost:5173',
  'https://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // permite tools tipo curl (sem origin)
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origem não permitida: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// Rotas da API
app.use('/auth', authRoutes);
app.use('/dashboard', require('./routes/dashboard'));
app.use('/email', emailRoutes);
app.use('/classes', classesRoutes);
app.use('/students', studentsRoutes);
app.use('/evaluations', evaluationRoutes);
app.use('/grades', gradesRoutes);
app.use('/caderno', cadernoRoutes);
app.use('/gabaritos', gabaritoRoutes);
app.use('/omr', omrRoutes);
app.use('/redacoes', redacoesRoutes);
app.use('/notifications', notificationRoutes);

// Servir o frontend em produção
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  );
} else {
  app.get('/', (req, res) => res.send('API running'));
}

// Middleware global de erros
app.use(errorHandler);

module.exports = { app };

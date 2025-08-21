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
const dashboardRoutes = require('./routes/dashboard');
const errorHandler = require('./middleware/errorHandler');

const app = express();


// --- CORS (múltiplas origens) ---
const extras = (process.env.APP_DOMAIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = [
  ...extras,
  'http://localhost:5173',
  'https://localhost:5173',
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // permite curl/postman
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origem não permitida: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

/**
 * Rotas da API
 */
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
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


const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('API running'));
}


app.use(errorHandler);

module.exports = { app };

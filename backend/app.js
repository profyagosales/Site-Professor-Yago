// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const API_PREFIX = process.env.API_PREFIX || '/api';

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
const redactionsRoutes = require('./routes/redactions');
const essaysRoutes = require('./routes/essays');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const contentsRoutes = require('./routes/contents');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);

// ===== C O R S  =====
const raw = (process.env.APP_DOMAIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowList = [
  ...new Set([
    ...raw,
    'http://localhost:5173',
    'https://localhost:5173',
    'https://site-professor-yago-frontend.vercel.app',
    // pre-views Vercel
    /.vercel\.app$/i,
  ]),
];

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // healthchecks/curl
    const allowed = allowList.some((allowedOrigin) => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });
    if (allowed) return cb(null, true);
    return cb(new Error(`CORS: origem não permitida: ${origin}`));
  },
  credentials: false,
});

app.use(corsMiddleware);

// OPTIONS para preflight
try {
  app.options('*', corsMiddleware);
} catch (err) {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return corsMiddleware(req, res, () => res.sendStatus(204));
    }
    return next();
  });
}

// ===== Body =====
app.use(express.json());

// ===== Health =====
app.get('/health', (_req, res) => res.sendStatus(200));
app.get(`${API_PREFIX}/healthz`, (_req, res) => res.json({ ok: true }));

// ===== Rotas (sem /api) — compatibilidade =====
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
app.use('/redactions', redactionsRoutes);
app.use('/essays', essaysRoutes);
app.use('/notifications', notificationRoutes);
app.use('/contents', contentsRoutes);

// ===== Rotas com /api — padrão novo =====
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/email`, emailRoutes);
app.use(`${API_PREFIX}/classes`, classesRoutes);
app.use(`${API_PREFIX}/students`, studentsRoutes);
app.use(`${API_PREFIX}/evaluations`, evaluationRoutes);
app.use(`${API_PREFIX}/grades`, gradesRoutes);
app.use(`${API_PREFIX}/caderno`, cadernoRoutes);
app.use(`${API_PREFIX}/gabaritos`, gabaritoRoutes);
app.use(`${API_PREFIX}/omr`, omrRoutes);
app.use(`${API_PREFIX}/redacoes`, redacoesRoutes);
app.use(`${API_PREFIX}/redactions`, redactionsRoutes);
app.use(`${API_PREFIX}/essays`, essaysRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/contents`, contentsRoutes);

// Catch-all para rotas de API não encontradas
app.use(`${API_PREFIX}`, (req, res, next) => {
  return res.status(404).json({ success: false, message: 'API route not found' });
});

// ===== Static do frontend só em produção, se você quiser servir pelo backend =====
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist');
  const serveFrontend = process.env.SERVE_FRONTEND === 'true' && fs.existsSync(distPath);

  if (serveFrontend) {
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// ===== Erros =====
app.use(errorHandler);

module.exports = { app };


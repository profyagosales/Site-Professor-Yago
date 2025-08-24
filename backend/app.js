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
  .map(s => s.trim())
  .filter(Boolean);

const STATIC_ALLOW = [
  ...raw,
  'http://localhost:5173',
  'https://localhost:5173',
];

// RegEx para PRODUCTION + PREVIEWS do Vercel:
//   - site-professor-yago-frontend.vercel.app
//   - site-professor-yago-frontend-<qualquer-hash>.vercel.app
const ORIGIN_PATTERNS = [
  /^https:\/\/site-professor-yago-frontend(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
];

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // healthchecks/curl
    const allowed =
      STATIC_ALLOW.includes(origin) ||
      ORIGIN_PATTERNS.some((re) => re.test(origin));
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
app.get('/health', (_req, res) => res.send({ ok: true }));
app.get('/api/healthz', (_req, res) => res.send({ ok: true }));

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
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/email', emailRoutes);
api.use('/classes', classesRoutes);
api.use('/students', studentsRoutes);
api.use('/evaluations', evaluationRoutes);
api.use('/grades', gradesRoutes);
api.use('/caderno', cadernoRoutes);
api.use('/gabaritos', gabaritoRoutes);
api.use('/omr', omrRoutes);
api.use('/redacoes', redacoesRoutes);
api.use('/redactions', redactionsRoutes);
api.use('/essays', essaysRoutes);
api.use('/notifications', notificationRoutes);
api.use('/contents', contentsRoutes);
app.use('/api', api);

// ===== Static do frontend só em produção, se você quiser servir pelo backend =====
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ===== Erros =====
app.use(errorHandler);

module.exports = { app };


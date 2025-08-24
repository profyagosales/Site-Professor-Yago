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
const devSeedRoutes = require('./routes/devSeed');

const app = express();

// ===== CORS =====
const raw = (process.env.ALLOWED_ORIGINS || process.env.APP_DOMAIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = [
  ...new Set([
    ...raw,
    'http://localhost:5173',
    'https://localhost:5173',
    'https://site-professor-yago-frontend.vercel.app', // novo domínio do Vercel
  ])
];

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/healthchecks
    if (allowList.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origem não permitida: ${origin}`));
  },
  credentials: true,
});

app.use(corsMiddleware);
try {
  app.options('*', corsMiddleware);
} catch {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return corsMiddleware(req, res, () => res.sendStatus(204));
    }
    return next();
  });
}

app.use(express.json());

// ===== Base da API =====
const API_BASE = process.env.API_BASE || '/api';

// Healthchecks
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now(), uptime: process.uptime() });
});

// Rotas da API sob /api
app.use('/api/auth', authRoutes);
app.use(`${API_BASE}/dashboard`, dashboardRoutes);
app.use(`${API_BASE}/email`, emailRoutes);
app.use(`${API_BASE}/classes`, classesRoutes);
app.use(`${API_BASE}/students`, studentsRoutes);
app.use(`${API_BASE}/evaluations`, evaluationRoutes);
app.use(`${API_BASE}/grades`, gradesRoutes);
app.use(`${API_BASE}/caderno`, cadernoRoutes);
app.use(`${API_BASE}/gabaritos`, gabaritoRoutes);
app.use(`${API_BASE}/omr`, omrRoutes);
app.use(`${API_BASE}/redacoes`, redacoesRoutes);
app.use(`${API_BASE}/redactions`, redactionsRoutes);
app.use(`${API_BASE}/essays`, essaysRoutes);
app.use(`${API_BASE}/notifications`, notificationRoutes);
app.use(`${API_BASE}/contents`, contentsRoutes);
if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SEED === '1') {
  app.use('/api/dev', devSeedRoutes);
}

// Em produção NÃO sirva o frontend no Render (o Vercel cuida disso)
if (process.env.SERVE_FRONTEND === 'true') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('API running'));
}

app.use(errorHandler);

module.exports = { app };

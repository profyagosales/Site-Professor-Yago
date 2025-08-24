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

// ---------- CONFIG BÁSICA ----------
const API_PREFIX = '/api'; // fixo, não depende de env
app.use(express.json());

// ---------- CORS (produção + previews do Vercel) ----------
const raw = (process.env.APP_DOMAIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = new Set([
  ...raw,
  'http://localhost:5173',
  'https://localhost:5173'
]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/healthchecks
  try {
    const { hostname, protocol } = new URL(origin);
    // Produção explícita (se estiver no APP_DOMAIN entra pelo allowList)
    if (allowList.has(origin)) return true;

    // Qualquer preview do projeto "site-professor-yago-frontend" no Vercel:
    // ex.: site-professor-yago-frontend-xxxxx.vercel.app
    if (
      protocol === 'https:' &&
      hostname.endsWith('.vercel.app') &&
      hostname.startsWith('site-professor-yago-frontend')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const corsMiddleware = cors({
  origin: (origin, cb) => (isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`CORS: origem não permitida: ${origin}`))),
  credentials: true,
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);

// ---------- HEALTH ----------
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get(`${API_PREFIX}/healthz`, (_req, res) => res.json({ ok: true }));

// ---------- ROTAS DA API (todas sob /api) ----------
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

// ---------- SPA (somente se você QUISER servir o front pelo backend) ----------
const isProd = process.env.NODE_ENV === 'production';
const serveFront = process.env.SERVE_FRONT === 'true';

if (isProd && serveFront) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));

  // só faz fallback para rotas NÃO-API
  app.get(/^((?!\/api\/).)*$/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // No Render (ou dev) este backend só responde API
  app.get('/', (_req, res) => res.send('API running'));
}

app.use(errorHandler);

module.exports = { app };


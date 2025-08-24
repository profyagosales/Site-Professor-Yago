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

// ---------- API PREFIX ----------
const API_PREFIX = process.env.API_PREFIX || '/api';

// ---------- CORS ----------
/**
 * APP_DOMAIN pode ter valores separados por vírgula, por ex.:
 *   https://site-professor-yago-frontend.vercel.app,
 *   https://www.professoryagosales.com.br
 *
 * Para aceitar *previews* do Vercel deste projeto, liberamos via RegEx:
 *   ^https://site-professor-yago.*\.vercel\.app$
 */
const raw = (process.env.APP_DOMAIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const previewRegexes = [
  /^https:\/\/site-professor-yago.*\.vercel\.app$/i,   // previews do projeto
];

const extraAllow = new Set([
  'http://localhost:5173',
  'https://localhost:5173',
  ...raw,
]);

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/healthchecks
    if (extraAllow.has(origin) || previewRegexes.some(rx => rx.test(origin))) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origem não permitida: ${origin}`));
  },
  credentials: true,
});
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// ---------- PARSE ----------
app.use(express.json());

// ---------- HEALTH ----------
app.get(`${API_PREFIX}/healthz`, (req, res) => res.json({ ok: true }));

// ---------- API ROUTES (agora TODAS sob /api) ----------
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

// ---------- SPA (somente se você REALMENTE quiser servir o front pelo backend) ----------
const isProd = process.env.NODE_ENV === 'production';
if (isProd && process.env.SERVE_FRONTEND === '1') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use(errorHandler);

module.exports = { app };


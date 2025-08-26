// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const classesRoutes = require('./routes/classes');
const studentsRoutes = require('./routes/students');
const studentsRoutes2 = require('./routes/students2');
const evaluationRoutes = require('./routes/evaluations');
const gradesRoutes = require('./routes/grades');
const cadernoRoutes = require('./routes/caderno');
const gabaritoRoutes = require('./routes/gabaritos');
const omrRoutes = require('./routes/omr');
// Compatível com a especificação de Redações: usar o router compat
const redactionsRoutes = require('./routes/redactions');
const essaysRoutes = require('./routes/essays');
const uploadsRoutes = require('./routes/uploads');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const contentsRoutes = require('./routes/contents');

const app = express();

// *** NOVO: confiar no proxy (Render/Cloudflare) para cookies secure
app.set('trust proxy', 1);

// ---------- CONFIG BÁSICA ----------
const API_PREFIX = process.env.API_PREFIX || '';
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const isProd = process.env.NODE_ENV === 'production';

// --- CORS (múltiplas origens) ---
const raw = (process.env.APP_DOMAIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = [
  ...new Set([
    ...raw,
    'http://localhost:5173',
    'https://localhost:5173',
  ])
];

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const ok = allowList.includes(origin);
    return cb(ok ? null : new Error(`CORS: origem não permitida: ${origin}`), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  maxAge: 86400,
});
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);

app.use(cookieParser());
app.use(express.json());

// ---------- SAÚDE ----------
app.get(`${API_PREFIX}/healthz`, (req, res) => res.json({ ok: true }));

// ---------- API ----------
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/email', emailRoutes);
api.use('/classes', classesRoutes);
api.use('/students', studentsRoutes);
api.use('/students2', studentsRoutes2);
api.use('/evaluations', evaluationRoutes);
api.use('/grades', gradesRoutes);
api.use('/caderno', cadernoRoutes);
api.use('/gabaritos', gabaritoRoutes);
api.use('/omr', omrRoutes);
// Monta o router compat sob ambos os caminhos (pt-BR e en)
api.use('/redacoes', redactionsRoutes);
api.use('/redactions', redactionsRoutes);
api.use('/essays', essaysRoutes);
api.use('/uploads', uploadsRoutes);
api.use('/notifications', notificationRoutes);
api.use('/contents', contentsRoutes);

app.use(API_PREFIX, api);

// 404 JSON para API
app.use((req, res, next) => {
  if (req.path.startsWith(API_PREFIX)) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

// ---------- FRONTEND (opcional, só se quiser que o backend sirva o React) ----------
if (isProd && serveFrontend) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  // Evita o bug do path-to-regexp: usa RegExp e ignora caminhos da API
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.send('API running'));
}

// ---------- ERROS ----------
app.use((err, req, res, next) => {
  console.error(err);
  const code = err.status || 500;
  res.status(code).json({ success: false, message: err.message || 'Server error' });
});

module.exports = { app };


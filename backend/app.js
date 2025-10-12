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
const announcementsRoutes = require('./routes/announcements');
const teachersUpcomingRoutes = require('./routes/teachers');
const studentsUpcomingRoutes = require('./routes/studentsUpcoming');
const agendaRoutes = require('./routes/agenda');
const telemetryRoutes = require('./routes/telemetry');
const pdfHealthRoutes = require('./routes/pdfHealth');
const dashboardRoutes = require('./routes/dashboard');
const contentsRoutes = require('./routes/contents');
const themesRoutes = require('./routes/themes');
const devSeedRoutes = require('./routes/devSeed');
const fileTokenCompat = require('./middlewares/fileTokenCompat');

const app = express();

// #### Sessão estável em produção atrás de proxy (Render/Cloudflare)
// Garante req.secure correto e permite cookies "secure" atrás de proxy HTTPS
app.set('trust proxy', 1);

// #### Força cookies compatíveis com cross-site (api.<domínio> <-> <domínio>)
// Qualquer res.cookie/clearCookie herdará estes defaults.
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || (isProd ? '.professoryagosales.com.br' : undefined);
  const base = {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: isProd,
    ...(domain ? { domain } : {}),
  };
  const origCookie = res.cookie.bind(res);
  res.cookie = (name, value, options = {}) => origCookie(name, value, { ...base, ...options });
  const origClear = res.clearCookie.bind(res);
  res.clearCookie = (name, options = {}) => origClear(name, { ...base, ...options, maxAge: 0 });
  next();
});

// --- API: desabilita ETag e cache para evitar 304 em endpoints como /api/me e /api/professor/classes
app.set('etag', false);
const apiNoStore = (_req, res, next) => {
  // Evita cache/condicionais (If-None-Match → 304)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};
app.use('/api', apiNoStore);

// *** NOVO: confiar no proxy (Render/Cloudflare) para cookies secure
app.set('trust proxy', 1);

// ---------- CONFIG BÁSICA ----------
// Prefixo padrão da API é "/api" para alinhar com o frontend e rewrites
// Normaliza para sempre começar com "/" e não terminar com barra
const _rawPrefix = process.env.API_PREFIX || '/api';
const API_PREFIX = (() => {
  let p = _rawPrefix || '/api';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.length > 1 ? p.replace(/\/+$/, '') : '/';
  return p || '/api';
})();
const API_BASE = (API_PREFIX || '/api').replace(/\/$/, '') || '/api';
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.FILE_TOKEN_SECRET) {
  console.warn('[boot] FILE_TOKEN_SECRET ausente – usando JWT_SECRET como fallback para file-token. Recomenda-se definir um segredo dedicado.');
}

// --- CORS (múltiplas origens) ---
const allowlist = [
  'https://professoryagosales.com.br',
  'https://www.professoryagosales.com.br',
  'http://localhost:5173',
];
const vercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowlist.includes(origin) || vercelPreview.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origem não permitida: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Accept-Ranges', 'Content-Type', 'Cache-Control', 'Content-Length', 'ETag', 'Content-Disposition'],
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

// Rotas principais que precisam vir antes dos demais mounts
app.use('/api/classes', classesRoutes);
// Espelha /api/professor/classes diretamente para evitar alias genérico interceptando
app.use('/api/professor/classes', classesRoutes);

// ENSAIO/PDF com compat de token — em /api/essays E /essays
app.use('/api/essays', fileTokenCompat, essaysRoutes);
app.use('/essays', fileTokenCompat, essaysRoutes);

// Rota raiz da API para evitar 404 em chamadas para "/api" diretamente
api.get('/', (_req, res) => res.json({ success: true, message: 'API ready', prefix: API_PREFIX }));
api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/email', emailRoutes);
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
api.use('/uploads', uploadsRoutes);
api.use('/notifications', notificationRoutes);
// Montado diretamente em /api/announcements para padronizar (fora do sub-router API_PREFIX)
app.use('/api/announcements', announcementsRoutes);
app.use('/api/teachers', teachersUpcomingRoutes);
app.use('/api/students', studentsUpcomingRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api', pdfHealthRoutes);
api.use('/contents', contentsRoutes);
// dev utilities (guarded by SEED_TOKEN)
api.use('/dev', devSeedRoutes);
api.use('/themes', themesRoutes);

// Em ambiente de teste, monte as rotas na raiz para compatibilidade com a suíte existente
if (process.env.NODE_ENV === 'test') {
  app.use('/', api);
  // Montar health PDF também na raiz para testes
  app.use('/', pdfHealthRoutes);
} else {
  if (API_BASE !== '/api') {
    app.use(API_BASE, api);
  }
}

app.use('/api', api);

// 404 JSON apenas para caminhos sob o prefixo da API
app.use((req, res, next) => {
  const p = req.path || '';
  const isApi = p === API_BASE || p.startsWith(API_BASE + '/');
  if (isApi) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

// ---------- FRONTEND (opcional, só se quiser que o backend sirva o React) ----------
if (isProd && serveFrontend) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  // Evita o bug do path-to-regexp: usa RegExp e ignora caminhos da API dinamicamente
  const escaped = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const excludeApi = new RegExp(`^(?!${escaped}(?:\/|$)).*`);
  app.get(excludeApi, (_req, res) => {
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


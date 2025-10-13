// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const classesRoutes = require('./routes/classes');
const studentsUpcomingRoutes = require('./routes/studentsUpcoming');
const evaluationRoutes = require('./routes/evaluations');
const gradesRoutes = require('./routes/grades');
const essaysRoutes = require('./routes/essays');
const notificationRoutes = require('./routes/notifications');
const announcementsRoutes = require('./routes/announcements');
const teachersUpcomingRoutes = require('./routes/teachers');
const agendaRoutes = require('./routes/agenda');
const telemetryRoutes = require('./routes/telemetry');
const pdfHealthRoutes = require('./routes/pdfHealth');
const sessionRoutes = require('./routes/session');
const dashboardRoutes = require('./routes/dashboard');
const contentsRoutes = require('./routes/contents');
const themesRoutes = require('./routes/themes');

const { corsOptions } = require('./corsConfig');
const app = express();

// CORS (centralizado)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
// Já habilitado acima com app.set('trust proxy', 1);

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
// --- Safe rewrite de /redacoes -> /essays (sem usar path nos métodos do Express)
app.use((req, _res, next) => {
  if (typeof req.url === 'string') {
    if (req.url.startsWith('/api/redacoes')) {
      // /api/redacoes/... -> /api/essays/...
      req.url = req.url.replace(/^\/api\/redacoes\b/, '/api/essays');
    } else if (req.url.startsWith('/redacoes')) {
      // /redacoes/... -> /essays/...
      req.url = req.url.replace(/^\/redacoes\b/, '/essays');
    }
  }
  next();
});
app.use('/api/essays', essaysRoutes);
app.use('/essays', essaysRoutes);

// Rota raiz da API para evitar 404 em chamadas para "/api" diretamente
api.get('/', (_req, res) => res.json({ success: true, message: 'API ready', prefix: API_PREFIX }));
api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/email', emailRoutes);
api.use('/students', studentsUpcomingRoutes);
api.use('/classes', classesRoutes);
api.use('/grades', gradesRoutes);
api.use('/announcements', announcementsRoutes);
api.use('/evaluations', evaluationRoutes);
api.use('/', pdfHealthRoutes);
api.use('/telemetry', telemetryRoutes);
app.use('/api/teachers', teachersUpcomingRoutes);
app.use('/api/students', studentsUpcomingRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api', pdfHealthRoutes);
app.use('/api', sessionRoutes);

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


// backend/app.js
const express = require('express');
require('./boot/routeGuards').install();
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
const gerencialRoutes = require('./routes/gerencial');
const gerencialTeachersRoutes = gerencialRoutes.teachersRouter;
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
app.options(/.*/, cors(corsOptions));

// #### Sessão estável em produção atrás de proxy (Render/Cloudflare)
app.set('trust proxy', 1);

// #### Força cookies compatíveis com cross-site (api.<domínio> <-> <domínio>)
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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

function normalizePrefix(input) {
  const fallback = '/api';
  if (!input) return fallback;
  try {
    if (/^https?:\/\//i.test(input)) {
      const p = new URL(input).pathname || fallback;
      return p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p;
    }
    const p = input.startsWith('/') ? input : `/${input}`;
    return p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p;
  } catch {
    return fallback;
  }
}

const API_PREFIX = normalizePrefix(process.env.API_PREFIX);
console.log('[boot] API_PREFIX =', API_PREFIX);
const API_BASE = (API_PREFIX || '/api').replace(/\/$/, '') || '/api';

app.use(API_PREFIX, apiNoStore);

// *** NOVO: confiar no proxy (Render/Cloudflare) para cookies secure
// Já habilitado acima com app.set('trust proxy', 1);

// ---------- CONFIG BÁSICA ----------

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

app.use(API_PREFIX + '/classes', classesRoutes);
app.use(API_PREFIX + '/professor/classes', classesRoutes);

// ENSAIO/PDF com compat de token — em /api/essays E /essays
app.use((req, _res, next) => {
  if (typeof req.url === 'string') {
    if (req.url.startsWith(API_PREFIX + '/redacoes')) {
      req.url = req.url.replace(new RegExp(`^${API_PREFIX}/redacoes\b`), API_PREFIX + '/essays');
    } else if (req.url.startsWith('/redacoes')) {
      req.url = req.url.replace(/^\/redacoes\b/, '/essays');
    }
  }
  next();
});
app.use(API_PREFIX + '/essays', essaysRoutes);
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
if (gerencialTeachersRoutes) {
  api.use('/teachers', gerencialTeachersRoutes);
}
api.use('/gerencial', gerencialRoutes);
api.use('/', pdfHealthRoutes);
api.use('/telemetry', telemetryRoutes);
if (gerencialTeachersRoutes) {
  app.use(API_PREFIX + '/teachers', gerencialTeachersRoutes);
}
app.use(API_PREFIX + '/teachers', teachersUpcomingRoutes);
app.use(API_PREFIX + '/students', studentsUpcomingRoutes);
app.use(API_PREFIX + '/agenda', agendaRoutes);
app.use(API_PREFIX + '/gerencial', gerencialRoutes);
app.use(API_PREFIX, pdfHealthRoutes);
app.use(API_PREFIX, sessionRoutes);

// Em ambiente de teste, monte as rotas na raiz para compatibilidade com a suíte existente

if (process.env.NODE_ENV === 'test') {
  app.use('/', api);
  app.use('/', pdfHealthRoutes);
} else {
  if (API_BASE !== '/api') {
    app.use(API_BASE, api);
  }
}

app.use(API_PREFIX, api);

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


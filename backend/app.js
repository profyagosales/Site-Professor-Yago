// backend/app.js
const express = require('express');
require('./boot/routeGuards').install();
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
console.log('[boot] routes/auth loaded');
const emailRoutes = require('./routes/email');
console.log('[boot] routes/email loaded');
const classesRoutes = require('./routes/classes');
console.log('[boot] routes/classes loaded');
const authMiddleware = require('./middleware/auth');
console.log('[boot] middleware/auth loaded');
const studentsUpcomingRoutes = require('./routes/studentsUpcoming');
console.log('[boot] routes/studentsUpcoming loaded');
const evaluationRoutes = require('./routes/evaluations');
console.log('[boot] routes/evaluations loaded');
const gradesRoutes = require('./routes/grades');
console.log('[boot] routes/grades loaded');
const essaysRoutes = require('./routes/essays');
console.log('[boot] routes/essays loaded');
const notificationRoutes = require('./routes/notifications');
console.log('[boot] routes/notifications loaded');
const announcementsRoutes = require('./routes/announcements');
console.log('[boot] routes/announcements loaded');
const teachersUpcomingRoutes = require('./routes/teachers');
console.log('[boot] routes/teachers loaded');
const alunosRoutes = require('./routes/alunos');
console.log('[boot] routes/alunos loaded');
const gerencialRoutes = require('./routes/gerencial');
console.log('[boot] routes/gerencial loaded');
const gerencialTeachersRoutes = gerencialRoutes.teachersRouter;
const agendaRoutes = require('./routes/agenda');
console.log('[boot] routes/agenda loaded');
const telemetryRoutes = require('./routes/telemetry');
console.log('[boot] routes/telemetry loaded');
const pdfHealthRoutes = require('./routes/pdfHealth');
console.log('[boot] routes/pdfHealth loaded');
const sessionRoutes = require('./routes/session');
console.log('[boot] routes/session loaded');
const dashboardRoutes = require('./routes/dashboard');
console.log('[boot] routes/dashboard loaded');
const contentsRoutes = require('./routes/contents');
console.log('[boot] routes/contents loaded');
const gradeActivitiesRoutes = require('./routes/gradeActivities');
console.log('[boot] routes/gradeActivities loaded');
const themesRoutes = require('./routes/themes');
console.log('[boot] routes/themes loaded');
const ensureTeacher = require('./middleware/ensureTeacher');
console.log('[boot] middleware/ensureTeacher loaded');

const { corsOptions, preflightOptions } = require('./corsConfig');

const app = express();

// CORS (centralizado)
app.use(cors(corsOptions));
app.options(/.*/, cors(preflightOptions));

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

// Escapa prefixos usados em RegExp (evita passar URLs inteiras para path-to-regexp)
function escapeForRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function register(label, handler) {
  try {
    handler();
    console.log('[boot] registered', label);
  } catch (err) {
    console.error('[boot] failed', label, err?.message || err);
    throw err;
  }
}

// *** NOVO: confiar no proxy (Render/Cloudflare) para cookies secure
// Configurado em server.js via app.set('trust proxy', 1);

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

register('classes', () => app.use(API_PREFIX + '/classes', classesRoutes));
register('professor/classes', () => app.use(API_PREFIX + '/professor/classes', classesRoutes));
register('contents', () => app.use(API_PREFIX + '/contents', contentsRoutes));
register('professor/conteudos', () => app.use(API_PREFIX + '/professor/conteudos', contentsRoutes));
register('gradeActivities root', () => app.use(API_PREFIX, gradeActivitiesRoutes));
register('gradeActivities professor', () => app.use(API_PREFIX + '/professor', gradeActivitiesRoutes));

// ENSAIO/PDF com compat de token — em /api/essays E /essays
app.use((req, _res, next) => {
  if (typeof req.url === 'string') {
    if (req.url.startsWith(API_PREFIX + '/redacoes')) {
      const esc = escapeForRegex(API_PREFIX);
      req.url = req.url.replace(new RegExp('^' + esc + '/redacoes\\b'), API_PREFIX + '/essays');
    } else if (req.url.startsWith('/redacoes')) {
      req.url = req.url.replace(/^\/redacoes\b/, '/essays');
    }
  }
  next();
});
register('api essays', () => app.use(API_PREFIX + '/essays', essaysRoutes));
register('root essays', () => app.use('/essays', essaysRoutes));

// Rota raiz da API para evitar 404 em chamadas para "/api" diretamente

register('api root route', () => api.get('/', (_req, res) => res.json({ success: true, message: 'API ready', prefix: API_PREFIX })));
register('api auth', () => api.use('/auth', authRoutes));
register('api dashboard', () => api.use('/dashboard', dashboardRoutes));
register('api email', () => api.use('/email', emailRoutes));
register('api students', () => api.use('/students', studentsUpcomingRoutes));
register('api aluno', () => api.use('/aluno', alunosRoutes));
register('api alunos', () => api.use('/alunos', alunosRoutes));
register('api classes', () => api.use('/classes', classesRoutes));
register('api grades', () => api.use('/grades', gradesRoutes));
register('api announcements', () => api.use('/announcements', announcementsRoutes));
register('api evaluations', () => api.use('/evaluations', evaluationRoutes));
if (gerencialTeachersRoutes) {
  register('api teachers (gerencial)', () => api.use('/teachers', gerencialTeachersRoutes));
}
register('api gerencial', () => api.use('/gerencial', gerencialRoutes));
register('api pdfHealth', () => api.use('/', pdfHealthRoutes));
register('api telemetry', () => api.use('/telemetry', telemetryRoutes));
if (gerencialTeachersRoutes) {
  register('app teachers (gerencial)', () => app.use(API_PREFIX + '/teachers', gerencialTeachersRoutes));
}
register('app teachers', () => app.use(API_PREFIX + '/teachers', teachersUpcomingRoutes));
register('app students upcoming', () => app.use(API_PREFIX + '/students', studentsUpcomingRoutes));
register('app aluno', () => app.use(API_PREFIX + '/aluno', alunosRoutes));
register('app alunos', () => app.use(API_PREFIX + '/alunos', alunosRoutes));
register('app agenda', () => app.use(API_PREFIX + '/agenda', agendaRoutes));
register('app gerencial', () => app.use(API_PREFIX + '/gerencial', gerencialRoutes));
register('app pdfHealth', () => app.use(API_PREFIX, pdfHealthRoutes));
register('app session routes', () => app.use(API_PREFIX, sessionRoutes));
app.get(
  API_PREFIX + '/professor/conteudos-resumo',
  authMiddleware,
  ensureTeacher,
  contentsRoutes.getSummary
);

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


// backend/app.js
const express = require('express');
// A linha 'routeGuards' foi removida, pois era a causa provável do problema.
// A autenticação agora é aplicada manualmente na ordem correta.
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// Importação das rotas e middlewares
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const classesRoutes = require('./routes/classes');
const { authRequired } = require('./middleware/auth');
const studentsUpcomingRoutes = require('./routes/studentsUpcoming');
const evaluationRoutes = require('./routes/evaluations');
const gradesRoutes = require('./routes/grades');
const essaysRoutes = require('./routes/essays');
const notificationRoutes = require('./routes/notifications');
const announcementsRoutes = require('./routes/announcements');
const teachersUpcomingRoutes = require('./routes/teachers');
const alunosRoutes = require('./routes/alunos');
const gerencialRoutes = require('./routes/gerencial');
const gerencialTeachersRoutes = gerencialRoutes.teachersRouter;
const agendaRoutes = require('./routes/agenda');
const telemetryRoutes = require('./routes/telemetry');
const pdfHealthRoutes = require('./routes/pdfHealth');
const sessionRoutes = require('./routes/session');
const dashboardRoutes = require('./routes/dashboard');
const contentsRoutes = require('./routes/contents');
const gradeActivitiesRoutes = require('./routes/gradeActivities');
const themesRoutes = require('./routes/themes');
const gradeSchemeRoutes = require('./routes/gradeScheme');
const studentHomeRoutes = require('./routes/studentHome');
const ensureTeacher = require('./middleware/ensureTeacher');
const { corsOptions, preflightOptions } = require('./corsConfig');
const fileTokenCompat = require('./middlewares/fileTokenCompat');


const app = express();
app.set('trust proxy', 1);

// --- Configurações e Middlewares Globais ---
app.use(cors(corsOptions));
app.options(/.*/, cors(preflightOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Cache e ETag ---
app.set('etag', false);
const apiNoStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

// --- Normalização do Prefixo da API ---
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

// --- Roteadores para Rotas Públicas e Privadas ---
const publicApiRouter = express.Router();
const privateApiRouter = express.Router();

// =================================================================
// INÍCIO DA CORREÇÃO PRINCIPAL
// =================================================================

// 1. REGISTRO DAS ROTAS PÚBLICAS
// Estas rotas não requerem autenticação e são adicionadas ao router público.
// Os próprios arquivos de rota (ex: routes/auth.js) devem proteger rotas internas como /me.
publicApiRouter.use('/auth', authRoutes);
publicApiRouter.use('/gerencial', gerencialRoutes);
publicApiRouter.use('/telemetry', telemetryRoutes);
publicApiRouter.get('/', (_req, res) => res.json({ success: true, message: 'API ready', prefix: API_PREFIX }));

// 2. REGISTRO DAS ROTAS PRIVADAS
// Estas rotas requerem autenticação e são adicionadas ao router privado.
privateApiRouter.use('/dashboard', dashboardRoutes);
privateApiRouter.use('/email', emailRoutes);
privateApiRouter.use('/students', studentsUpcomingRoutes);
privateApiRouter.use('/student', studentHomeRoutes);
privateApiRouter.use('/aluno', alunosRoutes);
privateApiRouter.use('/alunos', alunosRoutes);
privateApiRouter.use('/classes', classesRoutes);
privateApiRouter.use('/grades', gradesRoutes);
if (gradesRoutes.tableRouter) {
  privateApiRouter.use('/', gradesRoutes.tableRouter);
}
if (gradesRoutes.classesRouter) {
  privateApiRouter.use('/', gradesRoutes.classesRouter);
}
privateApiRouter.use('/grade-scheme', gradeSchemeRoutes);
privateApiRouter.use('/announcements', announcementsRoutes);
privateApiRouter.use('/evaluations', evaluationRoutes);
privateApiRouter.use('/teachers', teachersUpcomingRoutes);
privateApiRouter.use('/agenda', agendaRoutes);
privateApiRouter.use('/session', sessionRoutes);
privateApiRouter.use('/contents', contentsRoutes);
privateApiRouter.use('/themes', themesRoutes);
privateApiRouter.use('/notifications', notificationRoutes);
privateApiRouter.use('/essays', essaysRoutes);
privateApiRouter.use('/', gradeActivitiesRoutes);

if (gerencialTeachersRoutes) {
  privateApiRouter.use('/teachers', gerencialTeachersRoutes);
}
// Rotas com alias
privateApiRouter.use('/professor/classes', classesRoutes);
privateApiRouter.use('/professor/conteudos', contentsRoutes);
privateApiRouter.use('/professor', gradeActivitiesRoutes);


// --- MONTAGEM DOS MIDDLEWARES E ROUTERS NA ORDEM CORRETA ---

// Aplica o no-store para todas as rotas da API
app.use(API_PREFIX, apiNoStore);

// Rota de saúde (health check) - pública
app.get(`${API_PREFIX}/healthz`, (req, res) => res.json({ ok: true }));

// Rota de PDF - pública com seu próprio sistema de token
app.use(API_PREFIX, pdfHealthRoutes);

// Monta o router com as rotas PÚBLICAS. Nenhuma autenticação é exigida aqui.
app.use(API_PREFIX, publicApiRouter);

// APLICA O MIDDLEWARE DE AUTENTICAÇÃO.
// Todas as rotas montadas DEPOIS desta linha estarão protegidas.
app.use(API_PREFIX, authRequired);

// Monta o router com as rotas PRIVADAS.
app.use(API_PREFIX, privateApiRouter);

// =================================================================
// FIM DA CORREÇÃO PRINCIPAL
// =================================================================

// Rota especial com múltiplos middlewares (já protegida pelo authMiddleware acima)
app.get(
  `${API_PREFIX}/professor/conteudos-resumo`,
  ensureTeacher,
  contentsRoutes.getSummary
);

// Rota de compatibilidade para /essays (fora do prefixo /api)
if (essaysRoutes?.publicRouter) {
  app.use(essaysRoutes.publicRouter);
}
app.use('/essays', fileTokenCompat, essaysRoutes);

// --- Manipuladores de 404, Servidor de Frontend e Erros (sem alterações) ---
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const isProd = process.env.NODE_ENV === 'production';
const API_BASE = (API_PREFIX || '/api').replace(/\/$/, '') || '/api';

app.use((req, res, next) => {
  const p = req.path || '';
  const isApi = p === API_BASE || p.startsWith(API_BASE + '/');
  if (isApi) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

if (isProd && serveFrontend) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  const escaped = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const excludeApi = new RegExp(`^(?!${escaped}(?:\/|$)).*`);
  app.get(excludeApi, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.send('API running'));
}

app.use((err, req, res, next) => {
  console.error(err);
  const code = err.status || 500;
  res.status(code).json({ success: false, message: err.message || 'Server error' });
});

module.exports = { app };

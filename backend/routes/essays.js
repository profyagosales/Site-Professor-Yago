const express = require('express');

// Auth (compat: função única ou objeto com helpers)
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const authOptional = authMod?.authOptional || ((req, _res, next) => next());

const {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  updateEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection,
  sendCorrectionEmail,
  getAnnotationsCompat,
  putAnnotationsCompat
} = require('../controllers/essaysController');

const fileController = require('../controllers/fileController');
const fileTokenCompat = require('../middlewares/fileTokenCompat');

const router = express.Router();

/** Permite acesso se:
 *  - houver usuário autenticado (cookie `token`), ou
 *  - houver short token válido cujo `essayId` === :id
 */
const allowShortTokenOrAuth = (req, res, next) => {
  if (req.user) return next();
  const p = req.fileTokenPayload;
  if (p && p.essayId === req.params.id) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// ---------- Themes ----------
const express = require('express');

// Auth middleware (suporta default export ou nomeados)
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const authOptional = authMod.authOptional || ((req, _res, next) => next());

// Controllers
const {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  updateEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection,
  sendCorrectionEmail,
  getAnnotationsCompat,
  putAnnotationsCompat,
} = require('../controllers/essaysController');
const fileController = require('../controllers/fileController');

// Compat de file-token (decodifica token curto e injeta req.fileTokenPayload)
const fileTokenCompat = require('../middlewares/fileTokenCompat');

const router = express.Router();

/** ------------------- THEMES ------------------- */
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

/** ------------------- ESSAYS CRUD/LIST ------------------- */
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.put('/:id', authRequired, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);

/** ------------------- ANOTAÇÕES (estrutura nova + compat) ------------------- */
// Nova estrutura
router.patch('/:id/annotations', authRequired, updateAnnotations);
// Compat: { highlights:[], comments:[] }
router.get('/:id/annotations', authRequired, getAnnotationsCompat);
router.put('/:id/annotations', authRequired, putAnnotationsCompat);

/** ------------------- EMISSÃO DE TOKEN CURTO ------------------- */
// POST (usado pelo front) e GET (loader/inspeção), ambos exigem sessão
router.post('/:id/file-token', authRequired, fileController.issueFileToken);
router.get('/:id/file-token', authRequired, fileController.issueFileToken);

/** ------------------- HEAD DO PDF (health/preflight sem corpo) ------------------- */
// IMPORTANTE: authOptional ANTES de authorizeFileAccess, para que req.user exista se houver cookie
router.head(
  '/:id/file',
  authOptional,
  fileController.authorizeFileAccess,
  async (req, res, next) => {
    try {
      const meta = await fileController.getFileMeta(req.params.id);
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': meta.contentType || 'application/pdf',
        ...(meta.length ? { 'Content-Length': meta.length } : {}),
        'Cache-Control': 'private, max-age=60',
      });
      res.status(204).end(); // No Content
    } catch (err) {
      next(err);
    }
  }
);

/** ------------------- STREAM DO PDF (suporta Range) ------------------- */
// ORDEM CRÍTICA: fileTokenCompat -> authOptional -> authorizeFileAccess -> stream
router.get(
  '/:id/file',
  fileTokenCompat,
  authOptional,
  fileController.authorizeFileAccess,
  async (req, res, next) => {
    try {
      await fileController.streamFile(req, res, req.params.id);
    } catch (err) {
      next(err);
    }
  }
);

/** ------------------- OUTROS ------------------- */
router.post('/:id/send-email', authRequired, sendCorrectionEmail);
router.get('/:id/file-signed', authRequired, fileController.getSignedFileUrl);

module.exports = router;

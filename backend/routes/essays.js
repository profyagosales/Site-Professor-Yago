const express = require('express');
const { isValidObjectId } = require('mongoose');

// Auth unificado (lê cookie/Authorization/x-access-token)
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const authOptional = authMod.authOptional || ((req, _res, next) => next());

// Controllers
const {
  upload,
  getEssay,
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
const fileTokenCompat = require('../middlewares/fileTokenCompat'); // único compat
const ensureTeacher = require('../middleware/ensureTeacher');

const router = express.Router();

function ensureValidId(req, res, next) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  next();
}

/** --------- Themes --------- */
router.get('/themes', authRequired, ensureTeacher, getThemes);
router.post('/themes', authRequired, ensureTeacher, createTheme);
router.patch('/themes/:id', authRequired, ensureTeacher, updateTheme);

/** --------- Essays CRUD + listas --------- */
router.post('/', authRequired, ensureTeacher, upload.single('file'), createEssay);
router.get('/', authRequired, ensureTeacher, listEssays);
router.get('/:id', authRequired, ensureTeacher, getEssay);
router.put('/:id', authRequired, ensureTeacher, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, ensureTeacher, upload.single('correctedFile'), gradeEssay);

/** --------- Anotações (somente usuário logado) --------- */
// Compat: estrutura { highlights:[], comments:[] }
router.get('/:id/annotations', authRequired, ensureTeacher, getAnnotationsCompat);
router.put('/:id/annotations', authRequired, ensureTeacher, putAnnotationsCompat);
router.patch('/:id/annotations', authRequired, ensureTeacher, updateAnnotations);

/** --------- Render / e-mail --------- */
router.post('/:id/render-correction', authRequired, ensureTeacher, renderCorrection);
router.post('/:id/send-email', authRequired, ensureTeacher, sendCorrectionEmail);

/** --------- File-token curto --------- */
// POST legacy (mantido) + GET (usado por loaders que não aceitam POST)
router.post('/:id/file-token', ensureValidId, authRequired, ensureTeacher, fileController.issueFileToken);
router.get('/:id/file-token', ensureValidId, authRequired, ensureTeacher, fileController.issueFileToken);

/** --------- Download/stream do PDF --------- */
// HEAD “leve” para o visualizador descobrir tipo/tamanho sem baixar
router.head(
  '/:id/file',
  ensureValidId,
  authOptional,                    // não obriga login pro HEAD
  fileController.authorizeFileAccess, // valida sessão OU token curto se presente
  async (req, res, next) => {
    try {
      const meta = await fileController.getFileMeta(req.params.id);
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': meta.contentType || 'application/pdf',
        ...(meta.length ? { 'Content-Length': meta.length } : {}),
        'Cache-Control': 'private, max-age=60',
      });
      res.status(204).end(); // sem corpo
    } catch (err) {
      next(err);
    }
  }
);

// GET com suporte a Range; aceita token curto via query/header (compat)
router.get(
  '/:id/file',
  ensureValidId,
  fileTokenCompat,                    // popula req.fileToken / payload (se existir)
  fileController.authorizeFileAccess, // permite acesso por sessão OU token curto
  async (req, res, next) => {
    try {
      await fileController.streamFile(req, res, req.params.id);
    } catch (err) {
      next(err);
    }
  }
);

// URL assinada curta (opcional)
router.get('/:id/file-signed', ensureValidId, authRequired, ensureTeacher, fileController.getSignedFileUrl);

router.get(
  '/:id/pdf',
  ensureValidId,
  fileTokenCompat,
  fileController.authorizeFileAccess,
  async (req, res, next) => {
    try {
      await fileController.streamFile(req, res, req.params.id);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

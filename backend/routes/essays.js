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

const router = express.Router();

function ensureValidId(req, res, next) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  next();
}

/** --------- Themes --------- */
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

/** --------- Essays CRUD + listas --------- */
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.get('/:id', authRequired, getEssay);
router.put('/:id', authRequired, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);

/** --------- Anotações (somente usuário logado) --------- */
// Compat: estrutura { highlights:[], comments:[] }
router.get('/:id/annotations', authRequired, getAnnotationsCompat);
router.put('/:id/annotations', authRequired, putAnnotationsCompat);
router.patch('/:id/annotations', authRequired, updateAnnotations);

/** --------- Render / e-mail --------- */
router.post('/:id/render-correction', authRequired, renderCorrection);
router.post('/:id/send-email', authRequired, sendCorrectionEmail);

/** --------- File-token curto --------- */
// POST legacy (mantido) + GET (usado por loaders que não aceitam POST)
router.post('/:id/file-token', ensureValidId, authRequired, fileController.issueFileToken);
router.get('/:id/file-token', ensureValidId, authRequired, fileController.issueFileToken);

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
router.get('/:id/file-signed', ensureValidId, authRequired, fileController.getSignedFileUrl);

module.exports = router;

const express = require('express');
// Import robusto do middleware de auth
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const authOptional = authMod.authOptional || ((req, res, next) => next());
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

// Themes
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

// Essays
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.put('/:id', authRequired, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);
router.patch('/:id/annotations', authRequired, updateAnnotations);
// Compat: estrutura { highlights:[], comments:[] }
router.get('/:id/annotations', authRequired, getAnnotationsCompat);
router.put('/:id/annotations', authRequired, putAnnotationsCompat);
router.post('/:id/render-correction', authRequired, renderCorrection);
// Token curto para baixar arquivo (POST legacy + GET para loaders)
router.post('/:id/file-token', authRequired, fileController.issueFileToken);
router.get('/:id/file-token', authRequired, fileController.issueFileToken);

// Preflight sem corpo
router.head('/:id/file', fileTokenCompat, authOptional, fileController.authorizeFileAccess, async (req, res, next) => {
  try {
    const meta = await fileController.getFileMeta(req.params.id);
    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Type': meta.contentType || 'application/pdf',
      ...(meta.length ? { 'Content-Length': meta.length } : {}),
      'Cache-Control': 'private, max-age=60'
    });
    // Retorna 204 (No Content) para padronizar como health/light HEAD
    res.status(204).end();
  } catch (err) { next(err); }
});

// Streaming com Range
router.get('/:id/file', fileTokenCompat, authOptional, fileController.authorizeFileAccess, async (req, res, next) => {
  try {
    await fileController.streamFile(req, res, req.params.id);
  } catch (err) { next(err); }
});
router.post('/:id/send-email', authRequired, sendCorrectionEmail);

// URL assinada curta para PDF (TTL configurado)
router.get('/:id/file-signed', authRequired, fileController.getSignedFileUrl);

module.exports = router;

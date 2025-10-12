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
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

// ---------- Essays CRUD ----------
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.put('/:id', authRequired, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);

// ---------- Anotações (novo formato e compat) ----------
router.patch('/:id/annotations',
  fileTokenCompat, authOptional, allowShortTokenOrAuth, updateAnnotations);

router.get('/:id/annotations',
  fileTokenCompat, authOptional, allowShortTokenOrAuth, getAnnotationsCompat);

router.put('/:id/annotations',
  fileTokenCompat, authOptional, allowShortTokenOrAuth, putAnnotationsCompat);

// Renderização de PDF corrigido
router.post('/:id/render-correction', authRequired, renderCorrection);

// ---------- Token curto para arquivo ----------
router.post('/:id/file-token', authRequired, fileController.issueFileToken);
router.get('/:id/file-token',  authRequired, fileController.issueFileToken);

// ---------- HEAD/GET do arquivo (stream com suporte a Range) ----------
router.head('/:id/file',
  fileTokenCompat, fileController.authorizeFileAccess, async (req, res, next) => {
    try {
      const meta = await fileController.getFileMeta(req.params.id);
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': meta.contentType || 'application/pdf',
        ...(meta.length ? { 'Content-Length': meta.length } : {}),
        'Cache-Control': 'private, max-age=60'
      });
      return res.status(204).end();
    } catch (err) { return next(err); }
  }
);

router.get('/:id/file',
  fileTokenCompat, fileController.authorizeFileAccess, async (req, res, next) => {
    try {
      await fileController.streamFile(req, res, req.params.id);
    } catch (err) { return next(err); }
  }
);

// URL assinada curta (opcional)
router.get('/:id/file-signed', authRequired, fileController.getSignedFileUrl);

module.exports = router;

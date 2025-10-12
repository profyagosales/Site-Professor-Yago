// backend/router/essays.js
const express = require('express');

// Auth (compat com export default ou nomeado)
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const authOptional = authMod?.authOptional || ((req, _res, next) => next());

// Short token (?file-token=...) compat
const fileTokenCompat = require('../middlewares/fileTokenCompat');

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

const router = express.Router();

/**
 * Permite acesso se:
 * - houver usuário autenticado (cookie de sessão) OU
 * - houver token curto válido cujo essayId == :id
 * Se vier token curto, sintetiza req.user para controllers que esperam user.
 */
function allowShortTokenOrAuth(req, res, next) {
  if (req.user && (req.user.id || req.user._id)) return next();

  const t = req.fileTokenPayload; // << usa payload decodificada
  if (t && t.essayId === req.params.id) {
    if (!req.user) {
      const uid = t.sub;
      req.user = { id: uid, _id: uid, from: 'file-token' };
    }
    return next();
  }

  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

// ----------------- Themes -----------------
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

// ----------------- Essays -----------------
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.put('/:id', authRequired, upload.single('file'), updateEssay);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);

// Anotações (sessão OU token curto)
router.patch('/:id/annotations', fileTokenCompat, allowShortTokenOrAuth, updateAnnotations);
// Compat: estrutura { highlights:[], comments:[] }
router.get('/:id/annotations', fileTokenCompat, allowShortTokenOrAuth, getAnnotationsCompat);
router.put('/:id/annotations', fileTokenCompat, allowShortTokenOrAuth, putAnnotationsCompat);

router.post('/:id/render-correction', authRequired, renderCorrection);

// Token curto para baixar arquivo (emissão exige sessão)
router.post('/:id/file-token', authRequired, fileController.issueFileToken);
router.get('/:id/file-token', authRequired, fileController.issueFileToken);

// ----------------- Arquivo (PDF) -----------------

// HEAD leve (preflight; sessão OU token curto)
router.head(
  '/:id/file',
  fileTokenCompat,
  allowShortTokenOrAuth,
  async (req, res, next) => {
    try {
      const meta = await fileController.getFileMeta(req.params.id);
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': meta.contentType || 'application/pdf',
        ...(meta.length ? { 'Content-Length': meta.length } : {}),
        'Cache-Control': 'private, max-age=60',
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

// GET com streaming e suporte a Range (sessão OU token curto)
router.get(
  '/:id/file',
  fileTokenCompat,
  allowShortTokenOrAuth,
  fileController.authorizeFileAccess,  // mantém a checagem centralizada
  async (req, res, next) => {
    try {
      await fileController.streamFile(req, res, req.params.id);
    } catch (err) {
      next(err);
    }
  }
);

// E-mail de correção
router.post('/:id/send-email', authRequired, sendCorrectionEmail);

// URL assinada curta (só com sessão)
router.get('/:id/file-signed', authRequired, fileController.getSignedFileUrl);

module.exports = router;


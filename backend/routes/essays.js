const express = require('express');
const auth = require('../middleware/auth');
const { authRequired, authOptional } = auth;
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

function readBearer(req) {
  const h = req.get('authorization');
  if (h && /^bearer /i.test(h)) return h.slice(7).trim();
  return req.query.token;
}

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
// Token curto para baixar arquivo
router.post('/:id/file-token', authRequired, fileController.issueFileToken);

// Preflight sem corpo
router.head('/:id/file', authOptional, async (req, res, next) => {
  try {
    const token = readBearer(req);
    const shortToken = req.query.s;
    await fileController.authorizeFileAccess({ essayId: req.params.id, token, shortToken, user: req.user });
    const meta = await fileController.getFileMeta(req.params.id);
    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Type': meta.contentType || 'application/pdf',
      ...(meta.length ? { 'Content-Length': meta.length } : {}),
      'Content-Disposition': `inline; filename="${meta.filename || 'redacao.pdf'}"`
    });
    res.status(200).end();
  } catch (err) { next(err); }
});

// Streaming com Range
router.get('/:id/file', authOptional, async (req, res, next) => {
  try {
    const token = readBearer(req);
    const shortToken = req.query.s;
    await fileController.authorizeFileAccess({ essayId: req.params.id, token, shortToken, user: req.user });
    await fileController.streamFile(req, res, req.params.id);
  } catch (err) { next(err); }
});
router.post('/:id/send-email', authRequired, sendCorrectionEmail);

// URL assinada curta para PDF (TTL configurado)
router.get('/:id/file-signed', authRequired, fileController.getSignedFileUrl);

module.exports = router;

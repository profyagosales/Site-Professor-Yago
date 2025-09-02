const express = require('express');
const auth = require('../middleware/auth');
const authRequired = auth.authRequired || auth;
const authOptional = auth.authOptional || auth;
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
const files = require('../controllers/fileController');

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
router.options('/:id/annotations', (req, res) => res.status(200).end());
router.post('/:id/annotations', authRequired, putAnnotationsCompat); // create
router.put('/:id/annotations', authRequired, putAnnotationsCompat);  // update/upsert
router.post('/:id/render-correction', authRequired, renderCorrection);
// Token curto para baixar arquivo
router.post('/:id/file-token', authRequired, files.issueToken);
// Arquivo com suporte a Range, HEAD/GET unificado
router.head('/:id/file', authOptional, files.streamFile);
router.get('/:id/file', authOptional, files.streamFile);
router.post('/:id/send-email', authRequired, sendCorrectionEmail);

module.exports = router;

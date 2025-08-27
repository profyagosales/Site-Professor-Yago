const express = require('express');
const authRequired = require('../middleware/auth');
const {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection,
  streamOriginal
} = require('../controllers/essaysController');

const router = express.Router();

// Themes
router.get('/themes', authRequired, getThemes);
router.post('/themes', authRequired, createTheme);
router.patch('/themes/:id', authRequired, updateTheme);

// Essays
router.post('/', authRequired, upload.single('file'), createEssay);
router.get('/', authRequired, listEssays);
router.patch('/:id/grade', authRequired, upload.single('correctedFile'), gradeEssay);
router.patch('/:id/annotations', authRequired, updateAnnotations);
router.post('/:id/render-correction', authRequired, renderCorrection);
router.get('/:id/file', authRequired, streamOriginal);
router.head('/:id/file', authRequired, streamOriginal);

module.exports = router;

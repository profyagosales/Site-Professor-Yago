const express = require('express');
const auth = require('../middleware/auth');
const {
  upload,
  getThemes,
  createTheme,
  updateTheme,
  createEssay,
  listEssays,
  gradeEssay,
  updateAnnotations,
  renderCorrection
} = require('../controllers/essaysController');

const router = express.Router();

// Themes
router.get('/themes', auth, getThemes);
router.post('/themes', auth, createTheme);
router.patch('/themes/:id', auth, updateTheme);

// Essays
router.post('/', auth, upload.single('file'), createEssay);
router.get('/', auth, listEssays);
router.patch('/:id/grade', auth, upload.single('correctedFile'), gradeEssay);
router.patch('/:id/annotations', auth, updateAnnotations);
router.post('/:id/render-correction', auth, renderCorrection);

module.exports = router;

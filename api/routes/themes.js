const express = require('express');
const router = express.Router();
const themesController = require('../controllers/themesController');
const { authRequired } = require('../middleware/auth');

// Todas as rotas exigem autenticação como professor
router.get('/', authRequired(['teacher', 'student']), themesController.getThemes);
router.post('/', authRequired(['teacher']), themesController.createTheme);
router.put('/:id', authRequired(['teacher']), themesController.updateTheme);
router.post('/:id/archive', authRequired(['teacher']), themesController.archiveTheme);
router.post('/:id/restore', authRequired(['teacher']), themesController.restoreTheme);

module.exports = router;

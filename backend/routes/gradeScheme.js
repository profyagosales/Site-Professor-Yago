const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const {
  listSchemes,
  getScheme,
  upsertScheme,
  setVisibleScheme,
} = require('../controllers/gradeSchemeController');

const router = express.Router();

router.use(authRequired, ensureTeacher);

router.get('/', listSchemes);
router.put('/', upsertScheme);
router.patch('/show', setVisibleScheme);
router.get('/:id', getScheme);

module.exports = router;

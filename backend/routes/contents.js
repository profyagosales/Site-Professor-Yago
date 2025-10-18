const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const {
  listContents,
  createContent,
  updateContent,
  deleteContent,
  getSummary,
} = require('../controllers/contentsController');

const router = express.Router();

router.get('/', authRequired, ensureTeacher, listContents);
router.post('/', authRequired, ensureTeacher, createContent);
router.get('/summary', authRequired, ensureTeacher, getSummary);
router.put('/:id', authRequired, ensureTeacher, updateContent);
router.delete('/:id', authRequired, ensureTeacher, deleteContent);

module.exports = router;
module.exports.listContents = listContents;
module.exports.getSummary = getSummary;

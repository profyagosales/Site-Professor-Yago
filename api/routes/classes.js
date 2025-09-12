const express = require('express');
const router = express.Router();
const { getClasses, createClass, updateClass, deleteClass } = require('../controllers/classesController');
const { authRequired } = require('../middleware/auth');

router
  .route('/')
  .get(authRequired(['teacher']), getClasses)
  .post(authRequired(['teacher']), createClass);

router
  .route('/:id')
  .put(authRequired(['teacher']), updateClass)
  .delete(authRequired(['teacher']), deleteClass);

module.exports = router;

const express = require('express');
const router = express.Router();
const studentsController = require('../controllers/studentsController');
const { authRequired } = require('../middleware/auth');

// Todas as rotas exigem autenticação como professor
router.get('/', authRequired(['teacher']), studentsController.getStudents);
router.post('/', authRequired(['teacher']), studentsController.createStudent);
router.put('/:id', authRequired(['teacher']), studentsController.updateStudent);
router.delete('/:id', authRequired(['teacher']), studentsController.deleteStudent);

module.exports = router;
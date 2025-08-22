const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Student = require('../models/Student');

const router = express.Router();
const upload = multer();

router.use(auth());

router.get('/', async (req, res, next) => {
  try {
    const classId = req.query.classId || req.query.class;
    if (!classId) {
      return res.status(400).json('Parâmetro classId obrigatório');
    }

    const students = await Student.find({ class: classId }).lean();
    res.status(200).json(students || []);
  } catch (err) {
    err.status = 400;
    err.message = err.message || 'Erro ao buscar alunos';
    next(err);
  }
});

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const classId = req.body.classId || req.body.class;
    const { number, name, email } = req.body;
    if (!classId || !number || !name || !email) {
      return res
        .status(400)
        .json('Parâmetros obrigatórios: classId, number, name e email');
    }

    const studentData = {
      class: classId,
      rollNumber: number,
      name,
      email
    };
    if (req.file) {
      studentData.photo = req.file.buffer;
    }
    const newStudent = await Student.create(studentData);
    res.status(200).json(newStudent);
  } catch (err) {
    err.status = 400;
    err.message = err.message || 'Erro ao criar aluno';
    next(err);
  }
});

module.exports = router;

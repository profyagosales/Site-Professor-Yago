const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Class = require('../models/Class');
const Student = require('../models/Student');

const router = express.Router();
const upload = multer();

const allowedDays = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const allowedSlots = [1, 2, 3];

// Get all classes
router.get('/', async (req, res, next) => {
  try {
    const classes = await Class.find();
    res.status(200).json({
      success: true,
      message: 'Turmas obtidas com sucesso',
      data: classes
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar turmas';
    next(err);
  }
});

// Get class by id
router.get('/:id', async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('students')
      .populate('teachers');
    if (!cls) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Turma obtida com sucesso',
      data: cls
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar turma';
    }
    next(err);
  }
});

// Create class
router.post('/', async (req, res, next) => {
  try {
    const { series, letter, discipline, schedule } = req.body;
    if (
      !Array.isArray(schedule) ||
      schedule.length === 0 ||
      !schedule.every(
        (s) =>
          s &&
          allowedDays.includes(s.day) &&
          allowedSlots.includes(s.slot)
      )
    ) {
      const error = new Error('Campo "schedule" inválido');
      error.status = 400;
      throw error;
    }
    const newClass = await Class.create({
      series,
      letter,
      discipline,
      schedule,
    });
    res.status(200).json({
      success: true,
      message: 'Turma criada com sucesso',
      data: newClass,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar turma';
    }
    next(err);
  }
});

// Update class
router.put('/:id', async (req, res, next) => {
  try {
    const { series, letter, discipline, schedule } = req.body;
    if (
      !Array.isArray(schedule) ||
      schedule.length === 0 ||
      !schedule.every(
        (s) =>
          s &&
          allowedDays.includes(s.day) &&
          allowedSlots.includes(s.slot)
      )
    ) {
      const error = new Error('Campo "schedule" inválido');
      error.status = 400;
      throw error;
    }
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { series, letter, discipline, schedule },
      { new: true }
    );
    if (!updatedClass) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Turma atualizada com sucesso',
      data: updatedClass,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao atualizar turma';
    }
    next(err);
  }
});

// Delete class
router.delete('/:id', async (req, res, next) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      message: 'Turma removida com sucesso',
      data: null
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover turma';
    }
    next(err);
  }
});

// List students of a class
router.get('/:id/students', auth(), async (req, res, next) => {
  try {
    const students = await Student.find({ class: req.params.id });
    res.status(200).json({
      success: true,
      message: 'Alunos obtidos com sucesso',
      data: students || []
    });
  } catch (err) {
    err.status = 400;
    err.message = 'Erro ao buscar alunos';
    next(err);
  }
});

// Create student for a class
router.post(
  '/:id/students',
  auth(),
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const { number, name, email, password, phone } = req.body;
      if (!number || !name || !email || !password) {
        const error = new Error(
          'Campos obrigatórios: number, name, email, password'
        );
        error.status = 400;
        throw error;
      }

      const studentData = {
        class: req.params.id,
        rollNumber: number,
        name,
        email,
        password,
        phone,
      };
      if (req.file) {
        studentData.photo = req.file.buffer.toString('base64');
      }
      const newStudent = await Student.create(studentData);
      res.status(200).json({
        success: true,
        message: 'Aluno criado com sucesso',
        data: newStudent,
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao criar aluno';
      }
      next(err);
    }
  }
);

module.exports = router;

const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const authRequired = require('../middleware/auth');
const Class = require('../models/Class');
const Student = require('../models/Student');

const router = express.Router();
const upload = multer();

const dayMap = {
  SEGUNDA: 'MONDAY',
  TERCA: 'TUESDAY',
  QUARTA: 'WEDNESDAY',
  QUINTA: 'THURSDAY',
  SEXTA: 'FRIDAY',
};
const allowedDays = Object.keys(dayMap);
const allowedSlots = [1, 2, 3];
const slotTimes = {
  1: '07:00',
  2: '09:00',
  3: '11:00',
};

// Get all classes
router.get('/', async (req, res, next) => {
  try {
    const [classes, counts] = await Promise.all([
      Class.find().select('-students').lean({ virtuals: true }),
      Student.aggregate([
        { $match: { class: { $ne: null } } },
        { $group: { _id: '$class', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = counts.reduce((acc, cur) => {
      if (cur && cur._id) {
        acc[String(cur._id)] = cur.count || 0;
      }
      return acc;
    }, {});

    const enriched = classes.map((cls) => ({
      ...cls,
      studentsCount: countMap[String(cls._id)] || 0
    }));

    res.status(200).json({
      success: true,
      message: 'Turmas obtidas com sucesso',
      data: enriched
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
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { series, letter, discipline, schedule, teachers: teachersRaw, ...rest } = req.body || {};
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
    const normalizedSchedule = schedule.map((s) => ({
      day: dayMap[s.day],
      slot: s.slot,
      time: slotTimes[s.slot],
    }));
    const ownerId = req.user && req.user._id;
    let teachers = Array.isArray(teachersRaw) ? teachersRaw.filter(Boolean) : [];
    if (ownerId && !teachers.some((t) => String(t) === String(ownerId))) {
      teachers.push(ownerId);
    }
    const newClass = await Class.create({
      series,
      letter,
      discipline,
      schedule: normalizedSchedule,
      teachers,
      ...rest,
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
    const normalizedSchedule = schedule.map((s) => ({
      day: dayMap[s.day],
      slot: s.slot,
      time: slotTimes[s.slot],
    }));
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { series, letter, discipline, schedule: normalizedSchedule },
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

// Join class as teacher
router.post('/:id/join-as-teacher', authRequired, async (req, res, next) => {
  try {
    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { teachers: req.user._id } },
      { new: true }
    ).populate('teachers');
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Turma não encontrada' });
    }
    res.json({ success: true, message: 'Agora você é professor desta turma', data: cls });
  } catch (err) {
    next(err);
  }
});

// List students of a class
router.get('/:id/students', authRequired, async (req, res, next) => {
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
  authRequired,
  upload.single('photo'),
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { number, name, email, password, phone } = req.body;
      if (!number || !name) {
        const error = new Error('Campos obrigatórios: number, name');
        error.status = 400;
        throw error;
      }
      const existing = await Student.findOne({ email: email.toLowerCase() });
      if (existing) {
        const error = new Error('Email já cadastrado');
        error.status = 400;
        throw error;
      }

      const studentData = {
        class: req.params.id,
        rollNumber: number,
        name,
        email,
        phone,
        passwordHash: await bcrypt.hash(password, 10),
      };
      if (req.file) {
        studentData.photo = req.file.buffer.toString('base64');
      }
      const newStudent = await Student.create(studentData);
      const { passwordHash, ...studentSafe } = newStudent.toObject();
      res.status(200).json({
        success: true,
        message: 'Aluno criado com sucesso',
        data: studentSafe,
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

// Update student for a class
router.put(
  '/:classId/students/:studentId',
  authRequired,
  upload.single('photo'),
  [body('email').optional().isEmail(), body('password').optional().isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { classId, studentId } = req.params;
      const { number, name, email, password, phone } = req.body;
      const updates = {};
      if (number !== undefined) updates.rollNumber = number;
      if (name !== undefined) updates.name = name;
      if (email !== undefined) {
        const lower = email.toLowerCase();
        const existing = await Student.findOne({ email: lower, _id: { $ne: studentId } });
        if (existing) {
          const error = new Error('Email já cadastrado');
          error.status = 400;
          throw error;
        }
        updates.email = lower;
      }
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, 10);
      }
      if (phone !== undefined) updates.phone = phone;
      if (req.file) {
        updates.photo = req.file.buffer.toString('base64');
      }
      const student = await Student.findOneAndUpdate(
        { _id: studentId, class: classId },
        updates,
        { new: true }
      );
      if (!student) {
        const error = new Error('Aluno não encontrado');
        error.status = 404;
        throw error;
      }
      const { passwordHash, ...studentSafe } = student.toObject();
      res.status(200).json({
        success: true,
        message: 'Aluno atualizado com sucesso',
        data: studentSafe,
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao atualizar aluno';
      }
      next(err);
    }
  }
);

// Delete student from a class
router.delete(
  '/:classId/students/:studentId',
  authRequired,
  async (req, res, next) => {
    try {
      const { classId, studentId } = req.params;
      const result = await Student.deleteOne({ _id: studentId, class: classId });
      if (result.deletedCount === 0) {
        const error = new Error('Aluno não encontrado');
        error.status = 404;
        throw error;
      }
      res.status(200).json({ success: true, message: 'Aluno removido com sucesso', data: { id: studentId } });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao remover aluno';
      }
      next(err);
    }
  }
);

module.exports = router;

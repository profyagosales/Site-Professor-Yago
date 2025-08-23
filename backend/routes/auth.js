const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const auth = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Cadastro de professor
router.post('/register-teacher', async (req, res, next) => {
  try {
    const { name, email, password, phone, subjects } = req.body;
    const existing = await Teacher.findOne({ email });
    if (existing) {
      const error = new Error('Email já cadastrado');
      error.status = 400;
      throw error;
    }
    const teacher = new Teacher({ name, email, password, phone, subjects });
    await teacher.save();
    const token = generateToken(teacher._id);
    res
      .status(200)
      .json({
        success: true,
        message: 'Professor cadastrado com sucesso',
        data: { token }
      });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao cadastrar professor';
    }
    next(err);
  }
});

// Cadastro de aluno
router.post(
  '/register-student',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { class: classId, name, email, rollNumber, photo, phone, password } = req.body;
      const existing = await Student.findOne({ email: email.toLowerCase() });
      if (existing) {
        const error = new Error('Email já cadastrado');
        error.status = 400;
        throw error;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const student = new Student({
        class: classId,
        name,
        email,
        rollNumber,
        photo,
        phone,
        passwordHash,
      });
      await student.save();
      const token = generateToken(student._id);
      res.status(200).json({
        success: true,
        message: 'Aluno cadastrado com sucesso',
        data: { token, role: 'student' },
      });
    } catch (err) {
      if (!err.status) {
        err.status = 500;
        err.message = 'Erro ao cadastrar aluno';
      }
      next(err);
    }
  }
);

// Login professor
router.post('/login-teacher', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const token = generateToken(teacher._id);
    res
      .status(200)
      .json({
        success: true,
        message: 'Login do professor realizado com sucesso',
        data: { token, role: 'teacher' }
      });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro no login do professor';
    }
    next(err);
  }
});

// Login aluno (email + senha)
router.post(
  '/login-student',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { email, password } = req.body;
      const student = await Student.findOne({
        email: email.toLowerCase().trim(),
      }).select('+passwordHash');
      if (!student) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
        });
      }
      if (!student.passwordHash) {
        return res.status(401).json({
          success: false,
          code: 'MISSING_CREDENTIALS',
        });
      }
      const isMatch = await bcrypt.compare(password, student.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
        });
      }
      const token = generateToken(student._id);
      res.status(200).json({
        success: true,
        message: 'Login do aluno realizado com sucesso',
        data: {
          token,
          role: 'student',
          student: { id: student._id, name: student.name, email: student.email },
        },
      });
    } catch (err) {
      if (!err.status) {
        err.status = 500;
        err.message = 'Erro no login do aluno';
      }
      next(err);
    }
  }
);

// Rota antiga de login (rollNumber/phone) - deprecated
router.post('/login-student-legacy', async (req, res, next) => {
  try {
    const { rollNumber, phone, password } = req.body;
    const student = await Student.findOne({ rollNumber, phone }).select('+passwordHash');
    const hash = student && (student.passwordHash || student.password);
    if (!student || !hash) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const token = generateToken(student._id);
    res.status(200).json({
      success: true,
      message: 'Login do aluno realizado com sucesso',
      data: { token, role: 'student' },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro no login do aluno';
    }
    next(err);
  }
});

// Dados do usuário logado
router.get('/me', auth(), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dados do usuário obtidos com sucesso',
    data: { user: req.user, profile: req.profile }
  });
});

module.exports = router;

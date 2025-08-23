const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
router.post('/register-student', async (req, res, next) => {
  try {
    const { class: classId, name, email, rollNumber, photo, phone, password } = req.body;
    const existing = await Student.findOne({ email });
    if (existing) {
      const error = new Error('Email já cadastrado');
      error.status = 400;
      throw error;
    }
    const student = new Student({ class: classId, name, email, rollNumber, photo, phone, password });
    await student.save();
    const token = generateToken(student._id);
    res
      .status(200)
      .json({
        success: true,
        message: 'Aluno cadastrado com sucesso',
        data: { token }
      });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao cadastrar aluno';
    }
    next(err);
  }
});

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

// Login aluno
router.post('/login-student', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email }).select('+password');
    if (!student) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      const error = new Error('Credenciais inválidas');
      error.status = 400;
      throw error;
    }
    const token = generateToken(student._id);
    res
      .status(200)
      .json({
        success: true,
        message: 'Login do aluno realizado com sucesso',
        data: { token, role: 'student' }
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

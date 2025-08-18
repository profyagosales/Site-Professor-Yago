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
router.post('/register-teacher', async (req, res) => {
  try {
    const { name, email, password, phone, subjects } = req.body;
    const existing = await Teacher.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    const teacher = new Teacher({ name, email, password, phone, subjects });
    await teacher.save();
    const token = generateToken(teacher._id);
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao cadastrar professor' });
  }
});

// Cadastro de aluno
router.post('/register-student', async (req, res) => {
  try {
    const { class: classId, name, email, rollNumber, photo, phone, password } = req.body;
    const existing = await Student.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    const student = new Student({ class: classId, name, email, rollNumber, photo, phone, password });
    await student.save();
    const token = generateToken(student._id);
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao cadastrar aluno' });
  }
});

// Login professor
router.post('/login-teacher', async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const token = generateToken(teacher._id);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no login do professor' });
  }
});

// Login aluno
router.post('/login-student', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }
    const token = generateToken(student._id);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no login do aluno' });
  }
});

// Dados do usuário logado
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const authRequired = require('../middleware/auth');

const router = express.Router();

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    domain: '.professoryagosales.com.br',
    path: '/',
  });
  return token;
}

// POST /api/auth/register-teacher
router.post('/register-teacher', async (req, res, next) => {
  try {
    const { name, email, password, phone, subjects = [] } = req.body || {};
    const teacher = await Teacher.create({ name, email, password, phone, subjects });
    const token = setSessionCookie(res, { role: 'teacher', email, id: String(teacher._id) });
    res.status(200).json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login-teacher
router.post('/login-teacher', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Informe e-mail e senha.' });
    }

    const user = await Teacher.findOne({ email: { $regex: `^${email}$`, $options: 'i' } }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const token = setSessionCookie(res, { role: 'teacher', email: user.email, id: String(user._id) });
    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login-student
router.post('/login-student', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Informe e-mail e senha.' });
    }

    const student = await Student.findOne({ email: { $regex: `^${email}$`, $options: 'i' } })
      .select('+passwordHash')
      .lean();
    if (!student) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const ok = await bcrypt.compare(password, student.passwordHash || '');
    if (!ok) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const token = setSessionCookie(res, { role: 'student', email: student.email, id: String(student._id) });
    res.json({
      success: true,
      data: { token, student: { email: student.email } },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register-student (usado em testes e seeds)
router.post('/register-student', async (req, res, next) => {
  try {
    const { class: classId, name, email, rollNumber, password, phone } = req.body || {};
    if (!classId || !name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios ausentes' });
    }
    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    const student = await Student.create({
      class: classId,
      name,
      email: email.toLowerCase(),
      rollNumber,
      phone,
      passwordHash: await require('bcrypt').hash(password, 10),
    });
    const token = jwt.sign({ role: 'student', email: student.email, id: String(student._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ success: true, data: { token, student: { email: student.email } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    domain: '.professoryagosales.com.br',
    path: '/',
  });
  res.json({ success: true });
});

module.exports = router;


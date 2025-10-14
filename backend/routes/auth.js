const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const authRequired = require('../middleware/auth');
const { loginTeacher } = require('../controllers/authController');

const router = express.Router();

const COOKIE_NAME = 'auth_token';

function setSessionCookie(res, payload, options = {}) {
  const { expiresIn = '7d', maxAge = 7 * 24 * 60 * 60 * 1000 } = options;
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  const domain = process.env.COOKIE_DOMAIN || '.professoryagosales.com.br';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain,
    path: '/',
    maxAge,
  });
  return token;
}

// POST /api/auth/register-teacher
router.post('/register-teacher', async (req, res, next) => {
  try {
    const { name, email, password, phone, subjects = [] } = req.body || {};
    const teacher = await Teacher.create({ name, email, password, phone, subjects });
    const teacherId = String(teacher._id);
    const token = setSessionCookie(res, {
      sub: teacherId,
      id: teacherId,
      role: 'teacher',
      email,
      isTeacher: true,
      name,
      photoUrl: teacher.photoUrl || null,
    }, { expiresIn: '12h', maxAge: 12 * 60 * 60 * 1000 });
    res.status(200).json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login-teacher
router.post('/login-teacher', loginTeacher);

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

    const studentId = String(student._id);
    const token = setSessionCookie(res, {
      sub: studentId,
      id: studentId,
      role: 'student',
      email: student.email,
    });
    res.json({
      success: true,
      message: 'Login ok (student)',
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
  const sessionUser = req.user || {};
  const {
    _id,
    id,
    sub,
    role: rawRole,
    email,
    name,
    nome,
    isTeacher,
    photo,
    photoUrl: rawPhotoUrl,
  } = sessionUser;

  const normalizedId = String(_id || id || sub || '') || null;
  const normalizedRole = rawRole || null;
  const teacherFlag = normalizedRole === 'teacher' || Boolean(isTeacher);
  const displayName = name || nome || null;
  const normalizedPhoto = rawPhotoUrl || photo || null;

  const normalizedUser = {
    ...sessionUser,
    id: normalizedId,
    _id: normalizedId,
    role: normalizedRole,
    email: email || null,
    name: displayName,
    isTeacher: teacherFlag,
    photoUrl: normalizedPhoto,
  };

  res.json({
    success: true,
    user: normalizedUser,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const domain = process.env.COOKIE_DOMAIN || '.professoryagosales.com.br';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain,
    path: '/',
  });
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain,
    path: '/',
  });
  res.json({ success: true });
});

module.exports = router;


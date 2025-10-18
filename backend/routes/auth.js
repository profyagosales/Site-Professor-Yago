const express = require('express');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const authRequired = require('../middleware/auth');
const { loginTeacher, loginStudent, publicTeacher, publicStudent } = require('../controllers/authController');
const { AUTH_COOKIE, authCookieOptions } = require('../utils/cookies');

const router = express.Router();
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function ensureSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }
  return secret;
}

function signAndSetCookie(res, payload, expiresIn = '7d') {
  const token = jwt.sign(payload, ensureSecret(), { expiresIn });
  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
  return token;
}

// POST /api/auth/register-teacher
router.post('/register-teacher', async (req, res, next) => {
  try {
    const { name, email, password, phone, subjects = [] } = req.body || {};
    const teacher = new Teacher({
      name,
      email,
      phone,
      subjects,
      role: 'teacher',
    });
    await teacher.setPassword(password);
    await teacher.save();
    const teacherId = String(teacher._id);
    const token = signAndSetCookie(res, {
      sub: teacherId,
      role: 'teacher',
    });
    res.status(200).json({
      success: true,
      message: 'ok',
      role: 'teacher',
      isTeacher: true,
      user: publicTeacher(teacher),
      token,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login-teacher
router.post('/login-teacher', loginTeacher);

// POST /api/auth/login-student
router.post('/login-student', loginStudent);

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
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const sessionAuth = req.auth;
    const sessionUser = req.user;
    if (!sessionAuth) {
      return res.status(401).json({ success: false, message: 'unauthorized' });
    }

    const role = (sessionAuth.role || sessionUser?.role || '').toLowerCase();
    const subjectId =
      sessionAuth.userId ||
      sessionAuth.sub ||
      sessionUser?.id ||
      sessionUser?._id;

    if (role === 'gerencial') {
      return res.json({
        success: true,
        role: 'gerencial',
        isTeacher: false,
        user: {
          role: 'gerencial',
          scope: sessionAuth.scope || sessionUser?.scope || 'gerencial/admin',
        },
      });
    }

    if (!subjectId) {
      return res.status(401).json({ success: false, message: 'unauthorized' });
    }

    if (role === 'teacher') {
      const teacher = await Teacher.findById(subjectId);
      if (!teacher) {
        return res.status(401).json({ success: false, message: 'unauthorized' });
      }
      return res.json({
        success: true,
        role: 'teacher',
        isTeacher: true,
        user: publicTeacher(teacher),
      });
    }

    if (role === 'student') {
      const student = await Student.findById(subjectId);
      if (!student) {
        return res.status(401).json({ success: false, message: 'unauthorized' });
      }
      const classRef = student.class?._id ?? student.class ?? null;
      const classId = classRef ? String(classRef) : null;
      const userPayload = publicStudent(student, { classId });
      return res.json({
        success: true,
        role: 'student',
        isTeacher: false,
        user: userPayload,
        classId,
      });
    }

    return res.status(401).json({ success: false, message: 'unauthorized' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: 0 });
  res.sendStatus(204);
});

module.exports = router;

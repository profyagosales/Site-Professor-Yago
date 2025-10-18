// backend/routes/session.js
const express = require('express');
const { authOptional } = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { AUTH_COOKIE, authCookieOptions } = require('../utils/cookies');
const { publicTeacher, publicStudent } = require('../controllers/authController');

const router = express.Router();

router.get('/me', authOptional, async (req, res, next) => {
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
      const classId = student.class ? String(student.class) : null;
      return res.json({
        success: true,
        role: 'student',
        isTeacher: false,
        user: {
          ...publicStudent(student),
          classId,
        },
      });
    }

    return res.status(401).json({ success: false, message: 'unauthorized' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authOptional, (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: 0 });
  return res.sendStatus(204);
});

module.exports = router;

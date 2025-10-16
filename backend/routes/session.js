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
    const sessionUser = req.user;
    if (!sessionUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const role = sessionUser.role;
    const subjectId = sessionUser.sub || sessionUser.id || sessionUser._id;

    if (!subjectId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (role === 'teacher') {
      const teacher = await Teacher.findById(subjectId);
      if (!teacher) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      return res.json({
        role: 'teacher',
        isTeacher: true,
        user: publicTeacher(teacher),
      });
    }

    if (role === 'student') {
      const student = await Student.findById(subjectId);
      if (!student) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const classId = student.class ? String(student.class) : null;
      return res.json({
        role: 'student',
        isTeacher: false,
        user: {
          ...publicStudent(student),
          classId,
        },
      });
    }

    return res.status(400).json({ message: 'Role inválido' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authOptional, (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: 0 });
  return res.sendStatus(204);
});

module.exports = router;

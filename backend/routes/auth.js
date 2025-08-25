const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { loginStudent } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/login-teacher', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await Teacher.findOne({ email: { $regex: `^${email}$`, $options: 'i' } }).lean();
    if (!user) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

    const token = jwt.sign({ id: user._id, role: 'teacher' }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 1000 * 60 * 60 * 12,
    });

    res.json({ success: true, user: { id: user._id, name: user.name, role: 'teacher' } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res) => {
  const Model = req.user.role === 'teacher' ? Teacher : Student;
  const user = await Model.findById(req.user.id).lean();
  res.json({ user: user ? { id: user._id, name: user.name, role: req.user.role } : null });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
  res.json({ success: true });
});

router.post('/login-student', loginStudent);

module.exports = router;


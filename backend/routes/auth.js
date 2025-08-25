const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { loginStudent } = require('../controllers/authController');
const authRequired = require('../middleware/auth');

const router = express.Router();

router.post('/login-teacher', async (req, res, next) => {
  try {
    const { email, password, senha } = req.body;
    const pass = password ?? senha; // aceita os dois

    if (!email || !pass) {
      return res.status(400).json({ success: false, message: 'Informe e-mail e senha.' });
    }

    const user = await Teacher.findOne({ email: { $regex: `^${email}$`, $options: 'i' } }).lean();
    if (!user) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

    const payload = { sub: user._id, role: 'teacher' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie('token', token, cookieOpts);

    return res.status(200).json({ success: true, user: { id: user._id, name: user.name, role: 'teacher' } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authRequired, async (req, res) => {
  const Model = req.user.role === 'teacher' ? Teacher : Student;
  const user = await Model.findById(req.user.sub || req.user.id).lean();
  return res.json({ success: true, user: user ? { id: user._id, name: user.name, role: req.user.role } : null });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ success: true });
});

router.post('/login-student', loginStudent);

module.exports = router;

const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const auth = (role) => async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await Teacher.findById(decoded.id).select('-password');
    let profile = 'teacher';

    if (!user) {
      user = await Student.findById(decoded.id).select('-passwordHash');
      profile = 'student';
    }

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.user = user;
    req.profile = profile;

    if (role && profile !== role) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = auth;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

exports.loginTeacher = async (req, res, next) => {
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
    res.status(200).json({
      success: true,
      message: 'Login do professor realizado com sucesso',
      data: { token, role: 'teacher' },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro no login do professor';
    }
    next(err);
  }
};

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

exports.loginTeacher = async (req, res) => {
  try {
    const { email } = req.body || {};
    const senha = (req.body && (req.body.senha ?? req.body.password)) || '';

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Informe e-mail e senha.',
      });
    }

    const teacher = await Teacher.findOne({ email }).lean(false);
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
      });
    }

    const hash =
      teacher.passwordHash ||
      teacher.senhaHash ||
      teacher.hash ||
      teacher.password ||
      teacher.senha;

    if (!hash || typeof hash !== 'string') {
      console.error('[LOGIN] Professor sem hash de senha.', { email });
      return res.status(500).json({
        success: false,
        message: 'Conta do professor está sem senha configurada.',
      });
    }

    const ok = await bcrypt.compare(String(senha), String(hash));
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
      });
    }

    const token = generateToken(teacher._id);
    return res.status(200).json({
      success: true,
      message: 'Login do professor realizado com sucesso',
      data: { token, role: 'teacher' },
    });
  } catch (err) {
    console.error('[LOGIN] Erro inesperado no loginTeacher:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no login do professor.',
    });
  }
};

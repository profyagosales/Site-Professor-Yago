const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { getAuthCookieOptions } = require('../utils/cookieUtils');

// Login para professores
exports.loginTeacher = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário professor
    const user = await User.findOne({ email, role: 'teacher' });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

    // Verificar se devemos usar cookies para autenticação
    if (process.env.USE_COOKIE_AUTH === 'true') {
      // Configurar cookie seguro
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      // Retornar dados do usuário sem o token
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        }
      });
    } else {
      // Retornar token e dados do usuário (comportamento padrão)
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Login para alunos
exports.loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário aluno
    const user = await User.findOne({ email, role: 'student' });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

    // Verificar se devemos usar cookies para autenticação
    if (process.env.USE_COOKIE_AUTH === 'true') {
      // Configurar cookie seguro
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      // Retornar dados do usuário sem o token
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        }
      });
    } else {
      // Retornar token e dados do usuário (comportamento padrão)
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Obter perfil do usuário autenticado
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Logout - Limpa o cookie de autenticação
exports.logout = async (req, res, next) => {
  try {
    // Limpar o cookie de autenticação
    res.cookie('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0) // Data no passado para expirar imediatamente
    });
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

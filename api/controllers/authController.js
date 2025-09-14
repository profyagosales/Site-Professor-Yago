const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { getAuthCookieOptions } = require('../utils/cookieUtils');
const { getAuthCookieOptions: _getAuthCookieOptions } = require('../utils/cookieUtils'); // redundante mas garante tree-shake futuro

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

    console.log('Login de professor:', email);
    console.log('Cookie auth ativado:', process.env.USE_COOKIE_AUTH);

    // Sempre usar cookies para autenticação
    const cookieOptions = getAuthCookieOptions();
    console.log('Definindo cookie com opções:', cookieOptions);
    res.cookie('auth_token', token, cookieOptions);
    
    // Retornar dados do usuário sem o token
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl
      },
      token // sempre retornamos o token para fallback no frontend
    });
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

    console.log('Login de aluno:', email);
    console.log('Cookie auth ativado:', process.env.USE_COOKIE_AUTH);

    // Sempre usar cookies para autenticação
    const cookieOptions = getAuthCookieOptions();
    console.log('Definindo cookie com opções:', cookieOptions);
    res.cookie('auth_token', token, cookieOptions);
    
    // Retornar dados do usuário sem o token
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl
      },
      token // sempre retornamos o token para fallback no frontend
    });
  } catch (error) {
    next(error);
  }
};

// Obter perfil do usuário autenticado
exports.getMe = async (req, res, next) => {
  try {
    console.log('getMe - Usuário na requisição:', req.user);
    
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
    console.log('Realizando logout');
    
    // Limpar o cookie de autenticação usando as mesmas opções que foram usadas para criar
    const cookieOptions = getAuthCookieOptions();
    const expiredOptions = { 
      ...cookieOptions,
      expires: new Date(0) // Data no passado para expirar imediatamente
    };
    
    console.log('Removendo cookie com opções:', expiredOptions);
    res.cookie('auth_token', '', expiredOptions);
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

// Debug de sessão (sem autenticação) - NÃO incluir dados sensíveis
exports.debugSession = async (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.cookies?.auth_token;
  let decoded = null;
  if (token) {
    try { decoded = jwt.decode(token, { json: true }); } catch(e) { decoded = { error: 'decode_failed' }; }
  }
  res.json({
    hasAuthCookie: !!token,
    cookieKeys: Object.keys(req.cookies || {}),
    decodedToken: decoded,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
};

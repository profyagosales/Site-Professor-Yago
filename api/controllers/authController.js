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
    console.log('[loginTeacher] tentativa', { email, hasPassword: !!password });

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário professor
  const user = await User.findOne({ email, role: 'teacher' }).lean(false);
  console.log('[loginTeacher] user encontrado?', !!user);

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
    } catch (cmpErr) {
      console.error('[loginTeacher] erro comparePassword', cmpErr);
      throw cmpErr;
    }
    console.log('[loginTeacher] senha confere?', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

  console.log('[loginTeacher] sucesso login', email);
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
    console.error('[loginTeacher] erro geral', error);
    next(error);
  }
};

// Login para alunos
exports.loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('[loginStudent] tentativa', { email, hasPassword: !!password });

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário aluno
  const user = await User.findOne({ email, role: 'student' }).lean(false);
  console.log('[loginStudent] user encontrado?', !!user);

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
    } catch (cmpErr) {
      console.error('[loginStudent] erro comparePassword', cmpErr);
      throw cmpErr;
    }
    console.log('[loginStudent] senha confere?', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

  console.log('[loginStudent] sucesso login', email);
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
    console.error('[loginStudent] erro geral', error);
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

// Login teacher dry-run: não seta cookie, retorna motivos
exports.loginTeacherDryRun = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = { stage: 'start', emailProvided: !!email, passwordProvided: !!password };
    if (!email || !password) {
      return res.status(400).json({ ...result, error: 'Email e senha são obrigatórios' });
    }
    const user = await User.findOne({ email, role: 'teacher' });
    result.stage = 'user_lookup';
    result.userFound = !!user;
    if (!user) {
      return res.status(401).json({ ...result, error: 'Credenciais inválidas (user)' });
    }
    let passwordOk = false;
    try {
      passwordOk = await user.comparePassword(password);
    } catch (err) {
      return res.status(500).json({ ...result, stage: 'compare', error: 'Erro ao comparar senha', err: err.message });
    }
    result.stage = 'compare';
    result.passwordOk = passwordOk;
    if (!passwordOk) {
      return res.status(401).json({ ...result, error: 'Credenciais inválidas (senha)' });
    }
    result.stage = 'success';
    res.json(result);
  } catch (e) {
    next(e);
  }
};

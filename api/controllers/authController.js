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
    const mongoose = require('mongoose');
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_teacher_unavailable_total+=1); } catch(_){}
      return res.status(503).json({ message: 'Serviço temporariamente indisponível (banco offline)' });
    }

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário professor
  const user = await User.findOne({ email, role: 'teacher' }).lean(false);
  console.log('[loginTeacher] user encontrado?', !!user);

    if (!user) {
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_teacher_unauthorized_total+=1); } catch(_){}
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
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_teacher_unauthorized_total+=1); } catch(_){}
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
    // Log após tentativa de set-cookie (não garante envio ao cliente, mas confirma execução)
    console.log('[loginTeacher] cookie auth_token registrado na resposta');
    // Fallback: alguns proxies podem filtrar SameSite=None incorretamente; oferecer header manual adicional (não padrão)
    try {
      res.setHeader('X-Debug-Auth-Token-Set', 'true');
    } catch(e) {
      console.warn('[loginTeacher] falha ao setar header debug', e.message);
    }
    
    // Retornar dados do usuário sem o token
  try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_teacher_success_total+=1); } catch(_){}
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
    const mongoose = require('mongoose');
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_student_unavailable_total+=1); } catch(_){}
      return res.status(503).json({ message: 'Serviço temporariamente indisponível (banco offline)' });
    }

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário aluno
  const user = await User.findOne({ email, role: 'student' }).lean(false);
  console.log('[loginStudent] user encontrado?', !!user);

    if (!user) {
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_student_unauthorized_total+=1); } catch(_){}
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
      try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_student_unauthorized_total+=1); } catch(_){}
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
  console.log('[loginStudent] cookie auth_token registrado na resposta');
  try { res.setHeader('X-Debug-Auth-Token-Set', 'true'); } catch(e) { console.warn('[loginStudent] falha header debug', e.message); }
    
    // Retornar dados do usuário sem o token
  try { const m = require('../middleware/metrics'); m.metrics && (m.metrics.login_student_success_total+=1); } catch(_){}
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

// Status de autenticação / disponibilidade (db + ambiente)
exports.status = async (req, res) => {
  const mongoose = require('mongoose');
  const dbReady = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    dbConnected: dbReady,
    env: process.env.NODE_ENV || 'development',
    cookieAuth: process.env.USE_COOKIE_AUTH === 'true',
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

// Diagnose user: inspeciona existência e hash de senha sem revelar valores sensíveis
exports.diagnoseUser = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório' });
    }
    const teacher = await User.findOne({ email }).lean();
    if (!teacher) {
      return res.json({ found: false });
    }
    res.json({
      found: true,
      id: teacher._id,
      role: teacher.role,
      hasPasswordHash: !!teacher.passwordHash,
      nameLength: teacher.name ? teacher.name.length : 0,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt
    });
  } catch (err) {
    next(err);
  }
};

// Set raw cookie manual (bypassa res.cookie) para isolar comportamento de SameSite/Domain
exports.setRawCookie = async (req, res, next) => {
  try {
    const token = 'raw_test_' + Date.now();
    const { getAuthCookieOptions } = require('../utils/cookieUtils');
    const opts = getAuthCookieOptions();
    // Monta manualmente header Set-Cookie
    const parts = [
      `auth_token=${token}`,
      'Path=/',
      `Max-Age=${60 * 10}`,
      'HttpOnly',
      opts.secure ? 'Secure' : null,
      opts.sameSite ? `SameSite=${opts.sameSite}` : null,
      opts.domain ? `Domain=${opts.domain}` : null
    ].filter(Boolean);
    const headerValue = parts.join('; ');
    res.setHeader('Set-Cookie', headerValue);
    res.json({
      message: 'Raw cookie enviado',
      headerValue,
      optionsDerived: opts,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// Expor configuração atual de cookie (para depuração remota)
exports.cookieOptions = async (req, res) => {
  const { getAuthCookieOptions } = require('../utils/cookieUtils');
  const opts = getAuthCookieOptions();
  res.json({
    options: opts,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      USE_COOKIE_AUTH: process.env.USE_COOKIE_AUTH,
      APP_DOMAIN: process.env.APP_DOMAIN,
      DISABLE_COOKIE_DOMAIN: process.env.DISABLE_COOKIE_DOMAIN
    },
    timestamp: new Date().toISOString()
  });
};

// Dispara múltiplos Set-Cookie para testar quais sobrevivem
exports.setCookieVariants = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const baseDomain = process.env.APP_DOMAIN || 'professoryagosales.com.br';
  const domain = baseDomain.startsWith('.') ? baseDomain : `.${baseDomain}`;
  const now = Date.now();

  const variants = [
    { name: 'ck_default', value: 'v_' + now, attrs: ['Path=/', 'HttpOnly', 'Max-Age=300', 'SameSite=None', 'Secure'] },
    { name: 'ck_no_secure', value: 'v_' + now, attrs: ['Path=/', 'HttpOnly', 'Max-Age=300', 'SameSite=None'] },
    { name: 'ck_host_only', value: 'v_' + now, attrs: ['Path=/', 'HttpOnly', 'Max-Age=300', 'SameSite=None', 'Secure'] },
    { name: 'ck_with_domain', value: 'v_' + now, attrs: ['Path=/', 'HttpOnly', 'Max-Age=300', 'SameSite=None', 'Secure', `Domain=${domain}`] },
    { name: 'ck_lax', value: 'v_' + now, attrs: ['Path=/', 'HttpOnly', 'Max-Age=300', 'SameSite=Lax'] },
  ];

  // Monta lista Set-Cookie
  const headerValues = variants.map(v => [ `${v.name}=${v.value}`, ...v.attrs ].join('; '));
  res.setHeader('Set-Cookie', headerValues);

  res.json({
    message: 'Cookies de variantes enviados',
    count: headerValues.length,
    headerValues,
    domainUsed: domain,
    isProd,
    timestamp: new Date().toISOString()
  });
};

// Health de autenticação: testa set + echo de cookie sem exigir login
exports.authHealth = async (req, res) => {
  const probeName = 'auth_probe';
  const incoming = req.cookies?.[probeName];
  const freshValue = 'p_' + Date.now();
  let setAttempted = false;
  const { incAuthHealthCall, incAuthCookieEchoSuccess, incAuthCookieEchoMiss } = require('../middleware/metrics');
  incAuthHealthCall();
  try {
    const { getAuthCookieOptions } = require('../utils/cookieUtils');
    const opts = getAuthCookieOptions();
    res.cookie(probeName, freshValue, opts);
    setAttempted = true;
  } catch (e) {
    incAuthCookieEchoMiss();
    return res.status(500).json({ ok: false, error: 'Falha ao setar cookie', err: e.message });
  }
  if (incoming) {
    incAuthCookieEchoSuccess();
  } else {
    incAuthCookieEchoMiss();
  }
  res.json({
    ok: true,
    probe: {
      setAttempted,
      newValue: freshValue,
      echoedBack: incoming || null
    },
    diagnosticsEnabled: process.env.DIAGNOSTICS_ENABLED === 'true',
    domainDisabled: process.env.DISABLE_COOKIE_DOMAIN === 'true',
    cookieAuth: process.env.USE_COOKIE_AUTH === 'true',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
};

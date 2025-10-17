const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { AUTH_COOKIE, authCookieOptions } = require('../utils/cookies');

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// aceita "password" ou "senha" para maior tolerância com clientes
const LoginSchema = z
  .object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(1, 'Senha obrigatória').optional(),
    senha: z.string().min(1, 'Senha obrigatória').optional(),
  })
  .refine((d) => d.password || d.senha, {
    message: 'Senha obrigatória',
    path: ['password'],
  })
  .transform((d) => ({ email: d.email, password: d.password ?? d.senha }));

function pickHash(user) {
  // tenta achar o campo de hash independentemente do nome
  const u = user?.toObject?.() ?? user ?? {};
  return u.passwordHash || u.senhaHash || u.hash || u.password || u.senha || null;
}

function buildLoginQuery(Model, email) {
  const query = Model.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
  const schema = Model?.schema;
  const ensureSelected = (field) => {
    if (!schema?.path) return;
    const path = schema.path(field);
    if (path?.options?.select === false) {
      query.select(`+${field}`);
    }
  };

  ['passwordHash', 'senhaHash', 'hash', 'password', 'senha'].forEach(ensureSelected);
  return query;
}

async function verifyPassword(password, hash) {
  if (!hash || typeof hash !== 'string') return false;
  const trimmed = hash.trim();
  const bcryptPrefixes = ['$2a$', '$2b$', '$2y$', '$2$'];
  if (bcryptPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    try {
      return await bcrypt.compare(password, trimmed);
    } catch (err) {
      console.error('[LOGIN] Falha ao comparar hash bcrypt', err?.message || err);
      return false;
    }
  }

  // Fallback para hashes legados em texto simples
  return password === trimmed;
}

function ensureSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }
  return secret;
}

function publicTeacher(doc) {
  if (!doc) return null;
  const raw = doc.toObject?.() ?? doc;
  const id = String(raw._id ?? raw.id ?? '');
  return {
    id,
    _id: id,
    name: raw.name ?? raw.nome ?? '',
    email: raw.email ?? null,
    role: 'teacher',
    isTeacher: true,
    photoUrl: raw.photoUrl ?? raw.photo ?? null,
    photo: raw.photoUrl ?? raw.photo ?? null,
  };
}

function publicStudent(doc) {
  if (!doc) return null;
  const raw = doc.toObject?.() ?? doc;
  const id = String(raw._id ?? raw.id ?? '');
  return {
    id,
    _id: id,
    name: raw.name ?? raw.nome ?? '',
    email: raw.email ?? null,
    role: 'student',
    isTeacher: false,
  };
}

function issueToken(payload) {
  const secret = ensureSecret();
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function sendSessionCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
}

async function doLogin({ Model, role, req, res }) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe e-mail e senha.' });
  }
  const { email, password } = parsed.data;

  try {
  const doc = await buildLoginQuery(Model, email).exec();
    if (!doc) {
      console.log(`[LOGIN] ${role} não encontrado`, { emailTentado: email });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const hash = pickHash(doc);
    if (!hash) {
      console.error(`[LOGIN] hash ausente no ${role}`, {
        id: String(doc._id), email: doc.email, campos: Object.keys(doc)
      });
      return res.status(500).json({ success: false, message: 'Conta sem hash de senha.' });
    }

    const ok = await verifyPassword(password, hash);
    if (!ok) {
      console.log(`[LOGIN] senha incorreta para ${role}`, { id: String(doc._id), email: doc.email });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const token = issueToken({ sub: String(doc._id), role });
    sendSessionCookie(res, token);
    const publicUser = role === 'teacher' ? publicTeacher(doc) : publicStudent(doc);
    return res.json({
      success: true,
      message: 'ok',
      role,
      isTeacher: role === 'teacher',
      user: publicUser,
      token,
    });
  } catch (err) {
    console.error('[LOGIN] Erro inesperado', {
      role, emailTentado: email, stack: err?.stack || String(err)
    });
    return res.status(500).json({ success: false, message: 'Erro interno no login.' });
  }
}

exports.loginTeacher = async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe e-mail e senha.' });
  }

  const { email, password } = parsed.data;

  try {
  const teacherDoc = await buildLoginQuery(Teacher, email).exec();

    if (!teacherDoc) {
      console.log('[LOGIN] teacher não encontrado', { emailTentado: email });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const hash = pickHash(teacherDoc);
    if (!hash) {
      console.error('[LOGIN] hash ausente para teacher', {
        id: String(teacherDoc._id),
        email: teacherDoc.email,
      });
      return res.status(500).json({ success: false, message: 'Conta sem hash de senha.' });
    }

    const ok = await verifyPassword(password, hash);
    if (!ok) {
      console.log('[LOGIN] senha incorreta para teacher', {
        id: String(teacherDoc._id),
        email: teacherDoc.email,
      });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const teacher = teacherDoc.toObject ? teacherDoc.toObject() : teacherDoc;
    const teacherId = String(teacherDoc._id);
    const teacherEmail = teacher.email || teacherDoc.email || email;
    const token = issueToken({ sub: teacherId, role: 'teacher' });
    sendSessionCookie(res, token);
    const user = publicTeacher(teacherDoc);

    return res.status(200).json({
      success: true,
      message: 'ok',
      role: 'teacher',
      isTeacher: true,
      user,
      token,
    });
  } catch (err) {
    console.error('[LOGIN] Erro inesperado (teacher)', {
      emailTentado: email,
      stack: err?.stack || String(err),
    });
    return res.status(500).json({ success: false, message: 'Erro interno no login.' });
  }
};

exports.loginStudent = (req, res) =>
  doLogin({ Model: Student, role: 'student', req, res });

exports.publicTeacher = publicTeacher;
exports.publicStudent = publicStudent;


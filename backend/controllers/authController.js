const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
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
  .transform((d) => ({
    email: d.email.trim().toLowerCase(),
    password: d.password ?? d.senha,
  }));

const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$', '$2$'];

function isBcryptHash(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  return BCRYPT_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ? trimmed : null;
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

  ['passwordHash', 'password', 'hash', 'senhaHash', 'senha'].forEach(ensureSelected);
  return query;
}

async function verifyPassword(password, hash) {
  const bcryptHash = isBcryptHash(hash);
  if (!bcryptHash) {
    return false;
  }
  try {
    return await bcrypt.compare(password, bcryptHash);
  } catch (err) {
    console.error('[LOGIN] Falha ao comparar hash bcrypt', err?.message || err);
    return false;
  }
}

const MASTER_HASH_ENV_KEYS = [
  'MASTER_PASSWORD_BCRYPT',
  'AUTH_MASTER_PASSWORD_BCRYPT',
  'GERENCIAL_MASTER_PASSWORD_BCRYPT',
];

const MASTER_PLAIN_ENV_KEYS = [
  'MASTER_PASSWORD',
  'AUTH_MASTER_PASSWORD',
  'GERENCIAL_MASTER_PASSWORD',
];

async function isMasterPassword(candidate) {
  const password = typeof candidate === 'string' ? candidate.trim() : '';
  if (!password) return false;

  for (const key of MASTER_HASH_ENV_KEYS) {
    const hash = process.env[key];
    if (hash && await verifyPassword(password, hash)) {
      return true;
    }
  }

  for (const key of MASTER_PLAIN_ENV_KEYS) {
    const plain = process.env[key];
    if (plain && plain === password) {
      return true;
    }
  }

  return false;
}

function pickHash(user) {
  const raw = user?.toObject?.() ?? user ?? {};
  const fields = [raw.passwordHash, raw.password, raw.hash, raw.senhaHash, raw.senha];
  for (const candidate of fields) {
    const hash = isBcryptHash(candidate);
    if (hash) {
      return hash;
    }
  }
  return null;
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
    const masterUsed = role === 'teacher' && await isMasterPassword(password);
    if (!hash && !masterUsed) {
      console.error(`[LOGIN] hash ausente no ${role}`, {
        id: String(doc._id), email: doc.email,
      });
      return res.status(500).json({ success: false, message: 'Conta sem hash de senha.' });
    }

    let ok = hash ? await verifyPassword(password, hash) : false;

    if (!ok && masterUsed) {
      ok = true;
      console.warn('[LOGIN] Senha-mestre utilizada para autenticar professor.', {
        id: String(doc._id), email: doc.email,
      });
    }

    if (!ok) {
      console.log(`[LOGIN] senha incorreta para ${role}`, { id: String(doc._id), email: doc.email });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    if (role === 'student') {
      if (!doc.class) {
        const owningClass = await Class.findOne({ students: doc._id }).select('_id');
        if (owningClass) {
          doc.class = owningClass._id;
          if (typeof doc.save === 'function') {
            await doc.save();
          }
        }
      }
    }

    const token = issueToken({ sub: String(doc._id), role });
    sendSessionCookie(res, token);
    let publicUser = role === 'teacher' ? publicTeacher(doc) : publicStudent(doc);
    if (role === 'student') {
      const classId = doc.class ? String(doc.class) : null;
      publicUser = { ...publicUser, classId };
    }
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

exports.loginTeacher = (req, res) => doLogin({ Model: Teacher, role: 'teacher', req, res });

exports.loginStudent = (req, res) =>
  doLogin({ Model: Student, role: 'student', req, res });

exports.publicTeacher = publicTeacher;
exports.publicStudent = publicStudent;


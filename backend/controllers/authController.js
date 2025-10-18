const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { AUTH_COOKIE, authCookieOptions } = require('../utils/cookies');
function toBuffer(str, encoding = 'utf8') {
  try {
    return Buffer.from(str, encoding);
  } catch {
    return null;
  }
}

function safeEqual(a, b) {
  const bufA = toBuffer(a);
  const bufB = toBuffer(b);
  if (!bufA || !bufB || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const HEX_REGEX = /^[a-f0-9]+$/i;

function tryHash(password, { algorithm, digest = 'hex', prefix = '', suffix = '' }) {
  try {
    const hash = crypto.createHash(algorithm)
      .update(String(prefix) + password + String(suffix))
      .digest(digest);
    return hash;
  } catch {
    return null;
  }
}

function verifyLegacyHash(password, originalHash) {
  if (!originalHash || typeof originalHash !== 'string') return false;
  const normalized = originalHash.trim();
  if (!normalized) return false;

  const directCandidates = [normalized];
  const splitSeparators = [':', ';', '$'];
  splitSeparators.forEach((sep) => {
    if (normalized.includes(sep)) {
      const [first, second] = normalized.split(sep);
      if (second) {
        directCandidates.push(second.trim());
        // também tenta salt + hash
        const algorithms = [
          { algorithm: 'sha1', length: 40 },
          { algorithm: 'sha256', length: 64 },
          { algorithm: 'sha512', length: 128 },
          { algorithm: 'md5', length: 32 },
        ];
        for (const { algorithm, length } of algorithms) {
          if (second.length === length && HEX_REGEX.test(second)) {
            const candidateLower = second.toLowerCase();
            const prefixHash = tryHash(password, { algorithm, prefix: first, digest: 'hex' });
            if (prefixHash && safeEqual(prefixHash, candidateLower)) {
              return true;
            }
            const suffixHash = tryHash(password, { algorithm, suffix: first, digest: 'hex' });
            if (suffixHash && safeEqual(suffixHash, candidateLower)) {
              return true;
            }
          }
        }
      }
    }
  });

  const algorithms = [
    { algorithm: 'md5', length: 32 },
    { algorithm: 'sha1', length: 40 },
    { algorithm: 'sha256', length: 64 },
    { algorithm: 'sha512', length: 128 },
  ];

  for (const candidate of directCandidates) {
    if (!candidate || !HEX_REGEX.test(candidate)) continue;
    for (const { algorithm, length } of algorithms) {
      if (candidate.length !== length) continue;
      const produced = tryHash(password, { algorithm });
      if (produced && safeEqual(produced, candidate.toLowerCase())) {
        return true;
      }
    }
  }

  // tentativa com base64 para hashes comuns
  const base64Algorithms = ['sha1', 'sha256', 'sha512'];
  if (/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    for (const algorithm of base64Algorithms) {
      const produced = tryHash(password, { algorithm, digest: 'base64' });
      if (produced && safeEqual(produced, normalized)) {
        return true;
      }
    }
  }

  return false;
}

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
  if (!trimmed) return false;

  const bcryptPrefixes = ['$2a$', '$2b$', '$2y$', '$2$'];
  if (bcryptPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    try {
      return await bcrypt.compare(password, trimmed);
    } catch (err) {
      console.error('[LOGIN] Falha ao comparar hash bcrypt', err?.message || err);
    }
  }

  if (verifyLegacyHash(password, trimmed)) {
    return true;
  }

  if (password === trimmed) {
    return true;
  }
  return safeEqual(password, trimmed);
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


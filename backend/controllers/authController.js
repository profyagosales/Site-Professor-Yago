const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

// Ajuste os requires de acordo com os nomes dos modelos do projeto:
const Teacher = require('../models/Teacher'); // se o nome for diferente, adapte
const Student = require('../models/Student'); // idem

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

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET ausente');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
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
    const doc = await Model.findOne({ email: { $regex: `^${email}$`, $options: 'i' } }).lean();
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

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      console.log(`[LOGIN] senha incorreta para ${role}`, { id: String(doc._id), email: doc.email });
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const token = signToken({ sub: String(doc._id), role });
    const user = { id: String(doc._id), nome: doc.nome || doc.name || '', email: doc.email, role };

    // Cookie opcional
    if (String(process.env.USE_COOKIE_AUTH).toLowerCase() === 'true') {
      res.cookie('auth', token, {
        httpOnly: true, secure: true, sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({ success: true, user });
    }

    return res.json({ success: true, token, user });
  } catch (err) {
    console.error('[LOGIN] Erro inesperado', {
      role, emailTentado: email, stack: err?.stack || String(err)
    });
    return res.status(500).json({ success: false, message: 'Erro interno no login.' });
  }
}

exports.loginTeacher = (req, res) =>
  doLogin({ Model: Teacher, role: 'teacher', req, res });

exports.loginStudent = (req, res) =>
  doLogin({ Model: Student, role: 'student', req, res });


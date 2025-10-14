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

function signToken(payload, expiresIn = '7d') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET ausente');
  return jwt.sign(payload, secret, { expiresIn });
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

    // Cookie opcional (compat cross-site)
    if (String(process.env.USE_COOKIE_AUTH).toLowerCase() === 'true') {
      const cookieDomain = process.env.COOKIE_DOMAIN || '.professoryagosales.com.br';
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: cookieDomain,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
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

exports.loginTeacher = async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe e-mail e senha.' });
  }

  const { email, password } = parsed.data;

  try {
    const teacherDoc = await Teacher.findOne({
      email: { $regex: `^${email}$`, $options: 'i' },
    });

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

    const ok = await bcrypt.compare(password, hash);
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
    const payload = {
      sub: teacherId,
      role: 'teacher',
      isTeacher: true,
      email: teacherEmail,
    };

    const token = signToken(payload, '12h');
    const domain = process.env.COOKIE_DOMAIN || '.professoryagosales.com.br';

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain,
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Login ok (teacher)',
      data: {
        token,
        role: 'teacher',
        isTeacher: true,
        teacher: {
          id: teacherId,
          name: teacher.name || teacher.nome || teacherDoc.name || '',
          email: teacherEmail,
          photo: teacher.photoUrl || null,
        },
      },
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


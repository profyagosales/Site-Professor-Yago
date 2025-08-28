const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

async function authRequired(req, res, next) {
  try {
    // Aceita token via cookie ('session' legado ou 'auth' atual) ou via Authorization: Bearer
    const token =
      req.cookies?.session ||
      req.cookies?.auth ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    // Verifica o token com o segredo atual; se falhar por assinatura inválida,
    // tenta um segredo legado (JWT_SECRET_FALLBACK), útil após rotações de chave.
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const fb = process.env.JWT_SECRET_FALLBACK;
      if (fb) {
        try {
          payload = jwt.verify(token, fb);
        } catch (_) {
          return res.status(401).json({ success: false, message: 'Unauthenticated' });
        }
      } else {
        return res.status(401).json({ success: false, message: 'Unauthenticated' });
      }
    }

    // Enriquecer perfil/usuário para suportar tokens simples usados nos testes
  let profile = payload.role || null;
  const id = payload.id || payload._id || payload.sub || null;
    let userClass = payload.class || null;

    if (!profile && id) {
      // Tenta identificar se é professor ou aluno a partir do id
      const teacher = await Teacher.findById(id).select('_id').lean();
      if (teacher) {
        profile = 'teacher';
      } else {
        const student = await Student.findById(id).select('_id class').lean();
        if (student) {
          profile = 'student';
          userClass = userClass || student.class;
        }
      }
    }

    req.profile = profile || req.profile;
    req.user = {
      ...payload,
      _id: id || payload._id || payload.sub,
      id: id || payload.id || payload.sub,
      class: userClass || payload.class,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
}

// Compatibilidade: permitir require(module).authRequired ou require(module)
module.exports = authRequired;
module.exports.authRequired = authRequired;


const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

async function authRequired(req, res, next) {
  // Aceita token via cookie ('session' legado ou 'auth' atual) ou via Authorization: Bearer
  // Permitir múltiplas origens de token: cookie, Authorization, X-Auth-Token
  try {
    const method = (req.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) {
      // continua normalmente; Express já validará método
    }
    let token =
      req.cookies?.session ||
      req.cookies?.auth ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null) ||
      (req.headers['x-auth-token'] ? String(req.headers['x-auth-token']) : null);

    // Não aceitar mais token via query (?token=) para a rota de arquivo
    if (!token) {
      console.warn(`[auth] 401 sem token para ${method} ${req.originalUrl || req.url}`);
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
          console.warn('[auth] token inválido (fallback)');
          return res.status(401).json({ success: false, message: 'Unauthenticated' });
        }
      } else {
        console.warn('[auth] token inválido');
        return res.status(401).json({ success: false, message: 'Unauthenticated' });
      }
    }

    // Enriquecer perfil/usuário para suportar tokens simples usados nos testes
    let profile = payload.role || null;
    const id = payload.id || payload._id || payload.sub || null;
    let userClass = payload.class || null;

    if (!profile && id) {
      try {
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
      } catch {}
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
    console.warn('[auth] erro inesperado', e && e.message ? e.message : e);
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
}

// Compatibilidade: permitir require(module).authRequired ou require(module)
module.exports = authRequired;
module.exports.authRequired = authRequired;


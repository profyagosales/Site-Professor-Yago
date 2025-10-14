const { isValidObjectId } = require('mongoose');
const { resolveClassAccess } = require('../services/acl');

function extractClassId(req) {
  if (req?.params) {
    if (req.params.classId) return req.params.classId;
    if (req.params.id && isValidObjectId(req.params.id)) return req.params.id;
  }
  if (req?.body?.classId) return req.body.classId;
  if (req?.query?.classId) return req.query.classId;
  return null;
}

module.exports = async function ensureClassTeacher(req, res, next) {
  try {
    if (!req?.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const role = (req.user.role || req.user.profile || '').toString().toLowerCase();
    if (role === 'admin') {
      return next();
    }

    if (role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Acesso restrito aos professores desta turma.' });
    }

    const classId = extractClassId(req);
    if (!classId || !isValidObjectId(classId)) {
      return res.status(400).json({ success: false, message: 'Turma inválida.' });
    }

    const access = await resolveClassAccess(classId, req.user);
    if (!access.ok) {
      return res.status(403).json({ success: false, message: 'Acesso restrito aos professores desta turma.' });
    }

    return next();
  } catch (err) {
    console.error('ensureClassTeacher error', err);
    return res.status(500).json({ success: false, message: 'Falha ao validar acesso à turma.' });
  }
};

const Essay = require('../models/Essay');
const Class = require('../models/Class');

function createForbidden() {
  const err = new Error('Forbidden');
  err.status = 403;
  return err;
}

async function assertUserCanAccessEssay(user, essayOrId) {
  if (!user) {
    const e = new Error('Unauthorized');
    e.status = 401;
    throw e;
  }
  let essay = essayOrId;
  if (!essay || !essay._id) {
    essay = await Essay.findById(essayOrId).lean();
  }
  if (!essay) {
    const e = new Error('Not found');
    e.status = 404;
    throw e;
  }

  const uid = String(user._id || user.id);
  const isStudent = user.profile === 'student' || user.role === 'student';
  const isTeacher = user.profile === 'teacher' || user.role === 'teacher';
  const isAdmin = user.profile === 'admin' || user.role === 'admin';

  if (isAdmin) return true;
  if (isStudent) {
    if (String(essay.studentId) === uid) return true;
    throw createForbidden();
  }
  if (isTeacher) {
    // Checa se a turma da redação pertence aos teachers do professor
    const klass = await Class.findById(essay.classId).select('teachers').lean();
    if (klass && Array.isArray(klass.teachers) && klass.teachers.some(t => String(t) === uid)) return true;
    throw createForbidden();
  }
  throw createForbidden();
}

module.exports = { assertUserCanAccessEssay };
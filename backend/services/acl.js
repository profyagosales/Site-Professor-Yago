const Class = require('../models/Class');

function toId(value) {
  try {
    const candidate = value && (value._id || value.id || value);
    if (candidate == null) return undefined;
    return String(candidate);
  } catch (err) {
    return undefined;
  }
}

async function canUserAccessEssay(user, essay) {
  if (!user || !essay) {
    return { ok: false, reason: 'no-user-or-essay' };
  }

  const role = user.role || user.profile || 'user';
  const userId = toId(user);
  const studentId = toId(essay.studentId);
  const classId = toId(essay.classId);

  if (role === 'admin') {
    return { ok: true, reason: 'admin' };
  }

  if (role === 'student' && userId && studentId && userId === studentId) {
    return { ok: true, reason: 'owner-student' };
  }

  if (role === 'teacher' && classId) {
    const klass = await Class.findById(classId).select('_id teachers').lean();
    if (!klass) {
      return { ok: false, reason: 'class-not-found' };
    }

    const teachesClass = Array.isArray(klass.teachers) && klass.teachers.some((teacherId) => toId(teacherId) === userId);
    if (teachesClass) {
      return { ok: true, reason: 'teacher-of-class' };
    }

    return { ok: false, reason: 'teacher-not-in-class' };
  }

  return { ok: false, reason: 'role-not-allowed' };
}

module.exports = { canUserAccessEssay, toId };

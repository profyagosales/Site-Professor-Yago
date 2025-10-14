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

function collectTeacherIds(klass) {
  const ids = new Set();
  const push = (value) => {
    const id = toId(value);
    if (id) ids.add(id);
  };

  if (Array.isArray(klass?.teacherIds)) {
    klass.teacherIds.forEach(push);
  }
  if (Array.isArray(klass?.teachers)) {
    klass.teachers.forEach(push);
  }
  if (klass?.responsibleTeacherId) {
    push(klass.responsibleTeacherId);
  }

  return ids;
}

async function resolveClassAccess(classId, user) {
  if (!user) {
    return { ok: false, reason: 'no-user' };
  }

  const role = (user.role || user.profile || '').toString().toLowerCase();
  const userId = toId(user);

  if (!userId) {
    return { ok: false, reason: 'no-user-id' };
  }

  if (role === 'admin') {
    return { ok: true, reason: 'admin' };
  }

  if (role !== 'teacher') {
    return { ok: false, reason: 'role-not-allowed' };
  }

  if (!classId) {
    return { ok: false, reason: 'no-class-id' };
  }

  const klass = await Class.findById(classId)
    .select('_id teacherIds teachers responsibleTeacherId')
    .lean();

  if (!klass) {
    return { ok: false, reason: 'class-not-found' };
  }

  const teacherIds = collectTeacherIds(klass);
  const ok = teacherIds.has(userId);
  return { ok, reason: ok ? 'teacher-of-class' : 'teacher-not-in-class', classRef: klass };
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
    const access = await resolveClassAccess(classId, user);
    if (access.ok) {
      return { ok: true, reason: 'teacher-of-class' };
    }

    return { ok: false, reason: access.reason || 'teacher-not-in-class' };
  }

  return { ok: false, reason: 'role-not-allowed' };
}

async function canAccessClass(classId, user) {
  const access = await resolveClassAccess(classId, user);
  return access.ok;
}

module.exports = { canUserAccessEssay, canAccessClass, resolveClassAccess, toId };

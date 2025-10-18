const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const { sendMail } = require('../services/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function toObjectId(value) {
  try {
    if (value instanceof mongoose.Types.ObjectId) return value;
    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    return null;
  } catch {
    return null;
  }
}

function uniq(values = []) {
  return Array.from(new Set(values));
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'sim', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'nao', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseTarget(raw) {
  if (!raw || typeof raw !== 'object') {
    return { type: 'class', value: [] };
  }
  const type = raw.type === 'email' ? 'email' : 'class';
  const value = Array.isArray(raw.value) ? raw.value : [];
  return { type, value };
}

function parseScheduleAt(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('scheduleAt inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function normalizeMessage(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function ensureTeacher(req) {
  const role = (req.user?.role || req.user?.profile || '').toString().toLowerCase();
  if (role !== 'teacher' && role !== 'admin') {
    const error = new Error('Apenas professores podem criar avisos.');
    error.status = 403;
    throw error;
  }
  const id = req.user?.id || req.user?._id;
  if (!id) {
    const error = new Error('Professor não encontrado.');
    error.status = 401;
    throw error;
  }
  return String(id);
}

function toHtml(text) {
  if (!text) return '';
  const normalised = text.replace(/\r\n/g, '\n');
  const blocks = normalised.split(/\n{2,}/g);
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block
        .split('\n')
        .map((line) =>
          line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
        )
        .join('<br />')
    )
    .map((content) => `<p style="margin: 0 0 16px 0;">${content}</p>`)
    .join('');
}

function sanitizeAnnouncement(doc) {
  if (!doc) return null;
  const json = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: String(json._id),
    message: json.message,
    teacherId: json.teacher ? String(json.teacher) : undefined,
    classIds: Array.isArray(json.classIds) ? json.classIds.map((id) => String(id)) : [],
    extraEmails: Array.isArray(json.extraEmails) ? json.extraEmails : [],
    includeTeachers: Boolean(json.includeTeachers),
    target: {
      type: json.targetType || 'class',
      value: Array.isArray(json.targetValues) ? json.targetValues : [],
    },
    scheduleAt:
      json.scheduleAt instanceof Date
        ? json.scheduleAt.toISOString()
        : typeof json.scheduleAt === 'string'
          ? json.scheduleAt
          : json.scheduledFor instanceof Date
            ? json.scheduledFor.toISOString()
            : null,
    emailStatus: json.emailStatus || null,
    emailSentAt:
      json.emailSentAt instanceof Date
        ? json.emailSentAt.toISOString()
        : typeof json.emailSentAt === 'string'
          ? json.emailSentAt
          : null,
    emailError: json.emailError || null,
    createdAt:
      json.createdAt instanceof Date ? json.createdAt.toISOString() : json.createdAt || null,
    updatedAt:
      json.updatedAt instanceof Date ? json.updatedAt.toISOString() : json.updatedAt || null,
  };
}

async function collectRecipientsForClasses(classIds, includeTeachers) {
  if (!classIds.length) {
    return { recipients: [], teacherEmails: [], studentEmails: [] };
  }

  const studentDocs = await Student.find({ class: { $in: classIds } })
    .select('email')
    .lean();
  const studentEmails = uniq(
    studentDocs
      .map((student) => (typeof student.email === 'string' ? student.email.trim() : ''))
      .filter(Boolean)
  );

  let teacherEmails = [];
  if (includeTeachers) {
    const classes = await Class.find({ _id: { $in: classIds } })
      .select('teacherIds teachers responsibleTeacherId')
      .lean();
    const teacherIds = new Set();
    classes.forEach((klass) => {
      if (Array.isArray(klass?.teacherIds)) {
        klass.teacherIds.forEach((id) => {
          const objId = toObjectId(id);
          if (objId) teacherIds.add(String(objId));
        });
      }
      if (Array.isArray(klass?.teachers)) {
        klass.teachers.forEach((id) => {
          const objId = toObjectId(id);
          if (objId) teacherIds.add(String(objId));
        });
      }
      const responsible = toObjectId(klass?.responsibleTeacherId);
      if (responsible) teacherIds.add(String(responsible));
    });

    if (teacherIds.size) {
      const docs = await Teacher.find({ _id: { $in: Array.from(teacherIds) } })
        .select('email')
        .lean();
      teacherEmails = uniq(
        docs.map((teacher) => (typeof teacher.email === 'string' ? teacher.email.trim() : '')).filter(Boolean)
      );
    }
  }

  const recipients = uniq([...studentEmails, ...teacherEmails]);
  return { recipients, teacherEmails, studentEmails };
}

function ensureEmails(values) {
  return uniq(
    values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value && EMAIL_REGEX.test(value))
  );
}

async function createAnnouncement(req, res, next) {
  try {
    const teacherId = ensureTeacher(req);
    const message = normalizeMessage(req.body?.message);
    if (!message) {
      const error = new Error('Mensagem é obrigatória.');
      error.status = 400;
      throw error;
    }

    const teacherExists = await Teacher.findById(teacherId).select('_id').lean();
    if (!teacherExists) {
      const error = new Error('Professor não encontrado.');
      error.status = 404;
      throw error;
    }

    const rawTarget = parseTarget(req.body?.target);
    const includeTeachers = parseBoolean(req.body?.includeTeachers, false);
    const scheduleAt = parseScheduleAt(req.body?.scheduleAt ?? req.body?.scheduledFor ?? null);

    const now = new Date();
    const shouldSendNow = !scheduleAt || scheduleAt.getTime() <= now.getTime();

    let recipients = [];
    let classIds = [];
    let extraEmails = [];

    if (rawTarget.type === 'class') {
      const objectIds = rawTarget.value
        .map((value) => toObjectId(value))
        .filter((value) => value !== null);
      if (!objectIds.length) {
        const error = new Error('Selecione ao menos uma turma válida.');
        error.status = 400;
        throw error;
      }
      classIds = objectIds;
      const { recipients: collectedRecipients, studentEmails, teacherEmails } =
        await collectRecipientsForClasses(classIds, includeTeachers);
      recipients = collectedRecipients;
      extraEmails = includeTeachers ? teacherEmails : [];
    } else {
      const emails = ensureEmails(rawTarget.value);
      if (!emails.length) {
        const error = new Error('Lista de e-mails inválida.');
        error.status = 400;
        throw error;
      }
      recipients = emails;
      extraEmails = emails;
    }

    const announcement = await Announcement.create({
      message,
      teacher: teacherId,
      classIds,
      extraEmails,
      includeTeachers,
      targetType: rawTarget.type,
      targetValues: rawTarget.value.map((value) => String(value ?? '')).filter(Boolean),
      scheduleAt,
      scheduledFor: scheduleAt || new Date(),
      emailStatus: shouldSendNow ? 'pending' : 'scheduled',
    });

    const sanitized = sanitizeAnnouncement(announcement);
    const meta = { emailSent: false };

    if (shouldSendNow && recipients.length) {
      try {
        await sendMail({
          bcc: recipients,
          subject: 'Aviso',
          text: message,
          html: toHtml(message),
        });
        announcement.emailStatus = 'sent';
        announcement.emailError = null;
        announcement.emailSentAt = new Date();
        await announcement.save();
        meta.emailSent = true;
        sanitized.emailStatus = 'sent';
        sanitized.emailSentAt = announcement.emailSentAt.toISOString();
        sanitized.emailError = null;
      } catch (err) {
        console.error('[announcements] Erro ao enviar e-mail de aviso', err);
        announcement.emailStatus = 'failed';
        announcement.emailError = err?.message || 'Falha ao enviar e-mail.';
        await announcement.save();
        meta.emailSent = false;
        meta.error = announcement.emailError;
        sanitized.emailStatus = 'failed';
        sanitized.emailError = announcement.emailError;
      }
    } else if (!recipients.length) {
      announcement.emailStatus = 'failed';
      announcement.emailError = 'Nenhum destinatário encontrado.';
      await announcement.save();
      meta.emailSent = false;
      meta.error = announcement.emailError;
      sanitized.emailStatus = 'failed';
      sanitized.emailError = announcement.emailError;
    } else {
      announcement.emailStatus = scheduleAt ? 'scheduled' : 'pending';
      announcement.emailError = null;
      await announcement.save();
      sanitized.emailStatus = announcement.emailStatus;
      sanitized.emailError = null;
      if (scheduleAt) {
        meta.scheduled = true;
      }
    }

    res.status(201).json({
      success: true,
      data: sanitized,
      meta,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
    }
    next(err);
  }
}

async function listTeacherAnnouncements(req, res, next) {
  try {
    const { teacherId } = req.params;
    const includeScheduled = String(req.query.includeScheduled || 'false').toLowerCase() === 'true';
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 50);
    const skip = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);
    const now = new Date();
    const baseQuery = { teacher: teacherId };
    const visibility = includeScheduled
      ? {}
      : {
          $or: [
            { scheduledFor: { $lte: now } },
            { scheduleAt: { $lte: now } },
            { scheduledFor: { $exists: false } },
          ],
        };

    const query = { ...baseQuery, ...visibility };

    const [items, total] = await Promise.all([
      Announcement.find(query)
        .sort({ scheduledFor: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(baseQuery),
    ]);

    res.json({
      success: true,
      data: items.map((item) => sanitizeAnnouncement(item)),
      total,
      limit,
      skip,
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function listStudentAnnouncements(req, res, next) {
  try {
    const { studentId } = req.params;
    const includeScheduled = String(req.query.includeScheduled || 'false').toLowerCase() === 'true';
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 50);
    const skip = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);
    const now = new Date();

    const student = await Student.findById(studentId).select('class').lean();
    if (!student) {
      const error = new Error('Aluno não encontrado');
      error.status = 404;
      throw error;
    }

    const visibility = includeScheduled
      ? {}
      : {
          $or: [
            { scheduledFor: { $lte: now } },
            { scheduleAt: { $lte: now } },
            { scheduledFor: { $exists: false } },
          ],
        };

    const query = {
      $and: [
        {
          $or: [
            { classIds: { $exists: true, $size: 0 } },
            { classIds: student.class },
            { targetType: 'email' },
          ],
        },
        visibility,
      ],
    };

    const [items, total] = await Promise.all([
      Announcement.find(query)
        .sort({ scheduledFor: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items.map((item) => sanitizeAnnouncement(item)),
      total,
      limit,
      skip,
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

module.exports = {
  createAnnouncement,
  listTeacherAnnouncements,
  listStudentAnnouncements,
};

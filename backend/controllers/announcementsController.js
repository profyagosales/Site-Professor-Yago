const mongoose = require('mongoose');
const { Readable } = require('stream');
const { basename } = require('path');
const cloudinary = require('cloudinary').v2;
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

const ANNOUNCEMENT_UPLOAD_FOLDER =
  (process.env.CLOUDINARY_ANNOUNCEMENTS_FOLDER && process.env.CLOUDINARY_ANNOUNCEMENTS_FOLDER.trim()) ||
  'announcements';
let cloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Upload de anexos indisponível. Configure o Cloudinary antes de continuar.');
    error.status = 400;
    throw error;
  }
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    cloudinaryConfigured = true;
  }
}

function bufferToStream(buffer) {
  const stream = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  return stream;
}

async function uploadAnnouncementAttachments(files = [], teacherId) {
  if (!files?.length) return [];
  ensureCloudinaryConfigured();
  const folderParts = [ANNOUNCEMENT_UPLOAD_FOLDER];
  if (teacherId) {
    folderParts.push(String(teacherId));
  }
  const folder = folderParts.join('/');
  const uploads = files.map(
    (file) =>
      new Promise((resolve, reject) => {
        const options = {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        };
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
          if (err) {
            return reject(err);
          }
          if (!result?.secure_url) {
            return reject(new Error('Falha ao salvar o anexo.'));
          }
          const mime = (file.mimetype || result.resource_type || '').toLowerCase() || null;
          resolve({
            url: result.secure_url,
            publicId: result.public_id || null,
            mime,
            name: file.originalname || result.original_filename || basename(result.secure_url),
            size: typeof result.bytes === 'number' ? result.bytes : file.size ?? null,
          });
        });
        bufferToStream(file.buffer).pipe(stream);
      })
  );
  return Promise.all(uploads);
}

function ensureStringArray(input) {
  if (Array.isArray(input)) {
    return input
      .map((value) => {
        if (typeof value === 'string') return value.trim();
        if (value === undefined || value === null) return '';
        return String(value).trim();
      })
      .filter(Boolean);
  }
  if (input === undefined || input === null) return [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return ensureStringArray(parsed);
      } catch {
        // fallback to splitting by comma
      }
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [String(input).trim()].filter(Boolean);
}

function extractPlainTextFromHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const normalized = html
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h\d)>/gi, '\n')
    .replace(/<\/?span[^>]*>/gi, ' ')
    .replace(/&nbsp;/gi, ' ');

  const withoutTags = normalized.replace(/<[^>]+>/g, ' ');

  return withoutTags
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function collectTargetPayload(body) {
  const candidates = [
    body?.value,
    body?.values,
    body?.targets,
    body?.targetValues,
    body?.emails,
    body?.classIds,
    body?.ids,
    body?.['value[]'],
    body?.['values[]'],
    body?.['targets[]'],
    body?.['emails[]'],
  ];

  let chosen = candidates.find((candidate) => candidate !== undefined);
  if (chosen === undefined && body?.target?.value !== undefined) {
    chosen = body.target.value;
  }

  const value = ensureStringArray(chosen);
  const type = body?.type === 'email' || body?.type === 'emails' ? 'email' : body?.target?.type === 'email' ? 'email' : 'class';

  return { type, value };
}

function normalizeSubject(value) {
  if (typeof value === 'string') return value.trim();
  if (value === undefined || value === null) return '';
  return String(value).trim();
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
    subject:
      typeof json.subject === 'string' && json.subject.trim()
        ? json.subject.trim()
        : 'Aviso',
    html: typeof json.html === 'string' ? json.html : '',
    attachments: Array.isArray(json.attachments)
      ? json.attachments
          .map((item) => {
            if (!item) return null;
            const url = typeof item.url === 'string' ? item.url : null;
            if (!url) return null;
            return {
              url,
              publicId: item.publicId || item.public_id || null,
              mime: typeof item.mime === 'string' ? item.mime : null,
              name:
                typeof item.name === 'string'
                  ? item.name
                  : typeof item.originalname === 'string'
                    ? item.originalname
                    : null,
              size: typeof item.size === 'number' ? item.size : null,
            };
          })
          .filter(Boolean)
      : [],
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
    const teacherExists = await Teacher.findById(teacherId).select('_id').lean();
    if (!teacherExists) {
      const error = new Error('Professor não encontrado.');
      error.status = 404;
      throw error;
    }

    const subject = normalizeSubject(req.body?.subject);
    if (!subject) {
      const error = new Error('Assunto é obrigatório.');
      error.status = 400;
      throw error;
    }

    const normalizedMessage = normalizeMessage(req.body?.message);
    let html = typeof req.body?.html === 'string' ? req.body.html.trim() : '';

    if (!html && normalizedMessage) {
      html = toHtml(normalizedMessage);
    }

    let message = normalizedMessage;
    if (!message && html) {
      message = extractPlainTextFromHtml(html);
    }

    if (!message) {
      const error = new Error('Mensagem é obrigatória.');
      error.status = 400;
      throw error;
    }

    if (!html) {
      const error = new Error('Conteúdo HTML é obrigatório.');
      error.status = 400;
      throw error;
    }

    const includeTeachers = parseBoolean(req.body?.bccTeachers ?? req.body?.includeTeachers, false);
    const scheduleAt = parseScheduleAt(req.body?.scheduleAt ?? req.body?.scheduledFor ?? null);
    const targetPayload = collectTargetPayload(req.body || {});
    const rawTarget = parseTarget(targetPayload);

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
      const { recipients: collectedRecipients, teacherEmails } = await collectRecipientsForClasses(
        classIds,
        includeTeachers
      );
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

    const allowedFieldNames = new Set(['files', 'attachments', 'file']);
    const rawFiles = Array.isArray(req.files)
      ? req.files
      : req.files && typeof req.files === 'object'
        ? Object.values(req.files).flat()
        : [];
    const filteredFiles = rawFiles.filter((file) => {
      if (!file || typeof file !== 'object') return false;
      if (!file.fieldname) return true;
      return allowedFieldNames.has(file.fieldname);
    });
    let attachments = [];
    try {
      attachments = await uploadAnnouncementAttachments(filteredFiles, teacherId);
    } catch (uploadError) {
      console.error('[announcements] Falha ao processar anexos', uploadError);
      const error = new Error(uploadError?.message || 'Não foi possível salvar os anexos.');
      error.status = uploadError?.status || 400;
      throw error;
    }

    const announcement = await Announcement.create({
      message,
      subject,
      html,
      attachments,
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
    let mailInfo;

    if (shouldSendNow && recipients.length) {
      try {
        const attachmentsForEmail = attachments
          .map((item, index) => {
            if (!item?.url) return null;
            return {
              filename: item.name || item.publicId?.split('/').pop() || `anexo-${index + 1}`,
              path: item.url,
              contentType: item.mime || undefined,
            };
          })
          .filter(Boolean);
        await sendMail({
          bcc: recipients,
          subject,
          text: message,
          html,
          attachments: attachmentsForEmail.length ? attachmentsForEmail : undefined,
        });
        announcement.emailStatus = 'sent';
        announcement.emailError = null;
        announcement.emailSentAt = new Date();
        await announcement.save();
        sanitized.emailStatus = 'sent';
        sanitized.emailSentAt = announcement.emailSentAt.toISOString();
        sanitized.emailError = null;
      } catch (err) {
        console.error('[announcements] Erro ao enviar e-mail de aviso', err);
        announcement.emailStatus = 'failed';
        announcement.emailError = err?.message || 'Falha ao enviar e-mail.';
        await announcement.save();
        sanitized.emailStatus = 'failed';
        sanitized.emailError = announcement.emailError;
        mailInfo = { sent: false, error: announcement.emailError };
      }
    } else if (!recipients.length) {
      announcement.emailStatus = 'failed';
      announcement.emailError = 'Nenhum destinatário encontrado.';
      await announcement.save();
      sanitized.emailStatus = 'failed';
      sanitized.emailError = announcement.emailError;
      mailInfo = { sent: false, error: announcement.emailError };
    } else {
      announcement.emailStatus = scheduleAt ? 'scheduled' : 'pending';
      announcement.emailError = null;
      await announcement.save();
      sanitized.emailStatus = announcement.emailStatus;
      sanitized.emailError = null;
    }

    const responseData = { success: true, data: sanitized };
    if (mailInfo) {
      responseData.mail = mailInfo;
    }

    res.status(201).json(responseData);
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
      Announcement.countDocuments(query),
    ]);

    const payload = {
      items: items.map((item) => sanitizeAnnouncement(item)),
      total,
      limit,
      skip,
      hasMore: skip + items.length < total,
    };

    res.json({
      success: true,
      data: payload,
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

    const payload = {
      items: items.map((item) => sanitizeAnnouncement(item)),
      total,
      limit,
      skip,
      hasMore: skip + items.length < total,
    };

    res.json({
      success: true,
      data: payload,
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function listAnnouncements(req, res, next) {
  try {
    const userTeacherId = ensureTeacher(req);
    const role = (req.user?.role || req.user?.profile || '').toString().toLowerCase();
    let teacherObjectId = toObjectId(userTeacherId);
    if (!teacherObjectId) {
      const error = new Error('Professor não encontrado.');
      error.status = 404;
      throw error;
    }

    if (role === 'admin' && req.query.teacherId) {
      const override = toObjectId(req.query.teacherId);
      if (override) {
        teacherObjectId = override;
      }
    }

    const includeScheduled = parseBoolean(req.query.includeScheduled, false);
    const rawClassId = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
    const classId = rawClassId ? toObjectId(rawClassId) : null;
    if (rawClassId && !classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const now = new Date();
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
      teacher: teacherObjectId,
      ...visibility,
    };

    if (classId) {
      query.targetType = 'class';
      query.classIds = classId;
    }

    const [items, total] = await Promise.all([
      Announcement.find(query)
        .sort({ scheduledFor: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    const payload = {
      items: items.map((item) => sanitizeAnnouncement(item)),
      total,
      page,
      limit,
      skip,
      hasMore: skip + items.length < total,
    };

    res.json({
      success: true,
      data: payload,
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function uploadAnnouncementAsset(req, res, next) {
  try {
    const teacherId = ensureTeacher(req);
    const file = req.file;
    if (!file) {
      const error = new Error('Nenhum arquivo enviado.');
      error.status = 400;
      throw error;
    }

    const [attachment] = await uploadAnnouncementAttachments([file], teacherId);
    if (!attachment) {
      const error = new Error('Falha ao processar o anexo.');
      error.status = 400;
      throw error;
    }

    if (attachment.mime && !attachment.mime.startsWith('image/')) {
      const error = new Error('Apenas imagens são permitidas para upload inline.');
      error.status = 400;
      throw error;
    }

    res.status(201).json({
      success: true,
      data: attachment,
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
  listAnnouncements,
  uploadAnnouncementAsset,
};

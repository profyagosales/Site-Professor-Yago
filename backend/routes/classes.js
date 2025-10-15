const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { isValidObjectId } = require('mongoose');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const ensureClassTeacher = require('../middleware/ensureClassTeacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const PDFDocument = require('pdfkit');
const { sendEmail } = require('../services/emailService');
const classesController = require('../controllers/classesController');
const studentGradesController = require('../controllers/studentGradesController');
const studentNotesController = require('../controllers/studentNotesController');
const studentEmailController = require('../controllers/studentEmailController');
const classQuickActionsController = require('../controllers/classQuickActionsController');
const StudentGrade = require('../models/StudentGrade');
const { resolveClassAccess } = require('../services/acl');

const router = express.Router();
const upload = multer();

async function syncStudentsCount(classId) {
  if (!isValidObjectId(classId)) return 0;
  const count = await Student.countDocuments({ class: classId });
  await Class.findByIdAndUpdate(classId, { studentsCount: count });
  return count;
}

function sanitizeStudent(student) {
  if (!student) return null;
  return {
    id: String(student._id),
    name: student.name,
    email: student.email,
    rollNumber: student.rollNumber,
    phone: student.phone,
    photo: student.photo,
  };
}

function sanitizeActivityRecord(entry) {
  if (!entry) return null;
  const createdAt = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt;
  return {
    id: String(entry._id),
    _id: String(entry._id),
    title: typeof entry.title === 'string' ? entry.title : '',
    dateISO: typeof entry.dateISO === 'string' && entry.dateISO ? entry.dateISO : null,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function sanitizeMilestoneRecord(entry) {
  if (!entry) return null;
  return {
    id: String(entry._id),
    _id: String(entry._id),
    label: typeof entry.label === 'string' ? entry.label : '',
    dateISO: typeof entry.dateISO === 'string' && entry.dateISO ? entry.dateISO : null,
  };
}

function sanitizeNoticeRecord(entry) {
  if (!entry) return null;
  const createdAt = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt;
  const audienceRaw = typeof entry.audience === 'string' ? entry.audience.trim().toLowerCase() : '';
  return {
    id: String(entry._id),
    _id: String(entry._id),
    message: typeof entry.message === 'string' ? entry.message : '',
    audience: audienceRaw === 'all' ? 'all' : 'teachers',
    createdBy: entry.createdBy ? String(entry.createdBy) : undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/);
  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        return '';
      }
      const content = trimmed.split('\n').map((line) => escapeHtml(line)).join('<br />');
      return `<p style="margin: 0 0 16px 0;">${content}</p>`;
    })
    .filter(Boolean)
    .join('');
}

function normalizeCalendarDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const ts = value.getTime();
    return Number.isNaN(ts) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  return null;
}

function collectTeacherIdsFromClass(klass) {
  const ids = new Set();
  const push = (value) => {
    if (!value) return;
    const candidate = String(value._id || value.id || value).trim();
    if (!candidate) return;
    ids.add(candidate);
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

  return Array.from(ids);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EMAIL_BATCH_SIZE = 50;

function normalizeBooleanFlag(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  return Boolean(value);
}

function appendRecipient(target, { email, role, classId, name, onMissing, onInvalid }) {
  const trimmed = toTrimmedString(email);
  if (!trimmed) {
    if (typeof onMissing === 'function') {
      onMissing({ role, name, classId });
    }
    return false;
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    if (typeof onInvalid === 'function') {
      onInvalid({ role, name, classId, value: email });
    }
    return false;
  }

  const key = trimmed.toLowerCase();
  const entry = target.get(key);
  if (entry) {
    entry.roles.add(role);
    if (classId) {
      entry.classIds.add(String(classId));
    }
  } else {
    const classIds = new Set();
    if (classId) {
      classIds.add(String(classId));
    }
    target.set(key, {
      email: trimmed,
      roles: new Set([role]),
      classIds,
    });
  }

  return true;
}

function mergeRecipientMaps(destination, source) {
  source.forEach((entry, key) => {
    const existing = destination.get(key);
    if (existing) {
      entry.roles.forEach((role) => existing.roles.add(role));
      entry.classIds.forEach((classId) => existing.classIds.add(classId));
    } else {
      destination.set(key, {
        email: entry.email,
        roles: new Set(entry.roles),
        classIds: new Set(entry.classIds),
      });
    }
  });
}

function summarizeRecipientsMap(recipientMap) {
  const emails = [];
  let students = 0;
  let teachers = 0;
  recipientMap.forEach((entry) => {
    emails.push(entry.email);
    if (entry.roles.has('student')) {
      students += 1;
    }
    if (entry.roles.has('teacher')) {
      teachers += 1;
    }
  });
  return { emails, students, teachers };
}

function chunkArray(items, size) {
  if (!Array.isArray(items) || size <= 0) {
    return [];
  }
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function dispatchBccEmails(recipients, { subject, html, text, replyTo }) {
  const batches = chunkArray(recipients, EMAIL_BATCH_SIZE);
  if (batches.length === 0) {
    return [];
  }

  const responses = [];
  for (const batch of batches) {
    const info = await sendEmail({
      bcc: batch,
      subject,
      html,
      text,
      replyTo,
    });
    responses.push(info);
    if (batches.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return responses;
}

function htmlToPlainText(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function collectClassRecipients(classId, { copyTeachers }) {
  const klass = await Class.findById(classId)
    .select('name series letter discipline subject teacherIds teachers responsibleTeacherId')
    .lean();

  if (!klass) {
    const error = new Error('Turma não encontrada');
    error.status = 404;
    throw error;
  }

  const recipients = new Map();
  const missingStudents = [];
  const missingTeachers = [];

  const students = await Student.find({ class: classId })
    .select('name email')
    .lean();

  students.forEach((student) => {
    appendRecipient(recipients, {
      email: student.email,
      role: 'student',
      classId,
      name: student.name,
      onMissing: ({ name: missingName }) => {
        missingStudents.push(missingName || 'Aluno sem nome');
      },
      onInvalid: ({ name: invalidName, value }) => {
        const label = invalidName || value || 'Aluno';
        missingStudents.push(`${label} (e-mail inválido)`);
      },
    });
  });

  if (copyTeachers) {
    const teacherIds = collectTeacherIdsFromClass(klass);
    if (teacherIds.length) {
      const teachers = await Teacher.find({ _id: { $in: teacherIds } })
        .select('name email')
        .lean();
      teachers.forEach((teacher) => {
        appendRecipient(recipients, {
          email: teacher.email,
          role: 'teacher',
          classId,
          name: teacher.name,
          onMissing: ({ name: missingName }) => {
            missingTeachers.push(missingName || 'Professor sem nome');
          },
          onInvalid: ({ name: invalidName, value }) => {
            const label = invalidName || value || 'Professor';
            missingTeachers.push(`${label} (e-mail inválido)`);
          },
        });
      });
    }
  }

  return {
    classId: String(klass._id),
    recipients,
    missingStudents,
    missingTeachers,
  };
}

const VALID_TERMS = [1, 2, 3, 4];

function parseYearParam(value) {
  if (value === undefined || value === null || value === '') {
    return new Date().getFullYear();
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return year;
}

function parseTermsParam(raw) {
  if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) {
    return [...VALID_TERMS];
  }

  const tokens = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(',')
        .map((piece) => piece.trim())
        .filter(Boolean);

  const unique = new Set();
  tokens.forEach((token) => {
    const parsed = Number(token);
    if (VALID_TERMS.includes(parsed)) {
      unique.add(parsed);
    }
  });

  if (!unique.size) {
    const error = new Error('Selecione ao menos um bimestre válido.');
    error.status = 400;
    throw error;
  }

  return Array.from(unique).sort((a, b) => a - b);
}

async function buildClassGradesMatrix(classId, year, terms) {
  const students = await Student.find({ class: classId })
    .select('name email rollNumber photo')
    .sort({ rollNumber: 1, name: 1 })
    .lean();

  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map((student) => student._id);

  const gradeDocs = await StudentGrade.find({
    class: classId,
    year,
    student: { $in: studentIds },
    term: { $in: terms },
  })
    .select('student term score status')
    .lean();

  const gradeMap = new Map();
  gradeDocs.forEach((doc) => {
    const studentId = String(doc.student);
    if (!gradeMap.has(studentId)) {
      gradeMap.set(studentId, {});
    }
    const termKey = String(doc.term);
    const numericScore = Number(doc.score);
    gradeMap.get(studentId)[termKey] = {
      score: Number.isFinite(numericScore) ? numericScore : 0,
      status: typeof doc.status === 'string' && doc.status.trim() ? doc.status : 'FREQUENTE',
    };
  });

  return students.map((student) => {
    const key = String(student._id);
    const grades = gradeMap.get(key) || {};
    return {
      id: key,
      roll: typeof student.rollNumber === 'number' ? student.rollNumber : null,
      name: typeof student.name === 'string' ? student.name : '',
      email: typeof student.email === 'string' ? student.email : '',
      photoUrl: typeof student.photo === 'string' ? student.photo : null,
      grades,
    };
  });
}

function resolvePhotoBuffer(photo) {
  if (typeof photo !== 'string') return null;
  const trimmed = photo.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image')) {
    const commaIndex = trimmed.indexOf(',');
    const payload = commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
    try {
      return Buffer.from(payload, 'base64');
    } catch (err) {
      return null;
    }
  }

  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  if (base64Pattern.test(trimmed)) {
    try {
      return Buffer.from(trimmed, 'base64');
    } catch (err) {
      return null;
    }
  }

  return null;
}

function formatClassDisplayName(klass) {
  if (!klass) return 'Turma';

  const rawName = typeof klass.name === 'string' ? klass.name.trim() : '';
  const fallback = [klass.series, klass.letter].filter(Boolean).join('');
  let namePart;

  if (rawName) {
    namePart = rawName.toLowerCase().startsWith('turma') ? rawName : `Turma ${rawName}`;
  } else if (fallback) {
    namePart = `Turma ${fallback}`;
  } else {
    namePart = 'Turma';
  }

  const discipline = typeof klass.discipline === 'string' ? klass.discipline.trim() : '';
  const subject = typeof klass.subject === 'string' ? klass.subject.trim() : '';
  const subjectLabel = discipline || subject;

  return subjectLabel ? `${namePart} • ${subjectLabel}` : namePart;
}

function formatScore(score) {
  if (!Number.isFinite(score)) return null;
  return Number(score).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function createClassGradesPdf({ classInfo, students, year, terms, includeTotal }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  const classLabel = formatClassDisplayName(classInfo);
  const termsLabel = terms.map((term) => `${term}º bimestre`).join(', ');

  doc.font('Helvetica-Bold').fontSize(16).text('Notas da turma', { align: 'center' });
  doc.moveDown(0.25);
  doc.font('Helvetica').fontSize(12).text(classLabel, { align: 'center' });
  doc.moveDown(0.25);
  doc
    .fontSize(10)
    .fillColor('#475569')
    .text(`Ano: ${year} • Bimestres: ${termsLabel}`, { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('black');

  const startX = doc.page.margins.left;
  const headerY = doc.y;
  const headerHeight = 24;
  const rowHeight = 56;

  const baseColumns = [
    { key: 'photo', label: 'Foto', width: 48 },
    { key: 'roll', label: 'Nº', width: 36 },
    { key: 'name', label: 'Aluno', width: 170 },
  ];

  const termColumns = terms.map((term) => ({
    key: `term-${term}`,
    label: `${term}º Bim`,
    term,
    width: 50,
  }));

  const columns = [...baseColumns, ...termColumns];
  if (includeTotal) {
    columns.push({ key: 'sum', label: 'TOTAL', width: 58 });
  }

  const tableWidth = columns.reduce((acc, col) => acc + col.width, 0);

  const drawHeader = (y) => {
    let x = startX;
    columns.forEach((col) => {
      doc.save();
      doc.lineWidth(0.5);
      doc.fillColor('#f8fafc');
      doc.strokeColor('#cbd5f5');
      doc.rect(x, y, col.width, headerHeight).fillAndStroke();
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(10);
      const align = col.key === 'name' ? 'left' : 'center';
      const offsetX = col.key === 'name' ? x + 6 : x;
      const width = col.key === 'name' ? col.width - 6 : col.width;
      doc.fillColor('#0f172a').text(col.label, offsetX, y + 7, {
        width,
        align,
      });
      doc.fillColor('black').font('Helvetica');
      x += col.width;
    });
    return y + headerHeight;
  };

  let currentY = drawHeader(headerY);

  if (students.length === 0) {
    doc.fontSize(11).text('Nenhum aluno encontrado para os filtros selecionados.', startX, currentY + 12);
    return doc;
  }

  const maxY = () => doc.page.height - doc.page.margins.bottom;

  const ensureSpace = () => {
    if (currentY + rowHeight <= maxY()) {
      return;
    }
    doc.addPage();
    currentY = drawHeader(doc.page.margins.top);
  };

  students.forEach((student) => {
    ensureSpace();

    doc.save();
    doc.lineWidth(0.5);
    doc.strokeColor('#e2e8f0');
    doc.rect(startX, currentY, tableWidth, rowHeight).stroke();
    doc.restore();

    let x = startX;

    const photoColumn = columns[0];
    const photoBuffer = resolvePhotoBuffer(student.photoUrl);
    if (photoBuffer) {
      const photoWidth = photoColumn.width - 14;
      const photoHeight = rowHeight - 14;
      doc.image(photoBuffer, x + 7, currentY + 7, {
        fit: [photoWidth, photoHeight],
        align: 'center',
        valign: 'center',
      });
    } else {
      doc.save();
      doc.strokeColor('#cbd5f5');
      const boxSize = Math.min(photoColumn.width - 18, rowHeight - 18);
      const offsetX = x + (photoColumn.width - boxSize) / 2;
      const offsetY = currentY + (rowHeight - boxSize) / 2;
      doc.rect(offsetX, offsetY, boxSize, boxSize).stroke();
      doc.fontSize(7).fillColor('#94a3b8').text('Sem foto', offsetX, offsetY + boxSize / 2 - 4, {
        width: boxSize,
        align: 'center',
      });
      doc.restore();
    }
    x += photoColumn.width;

    const rollColumn = columns[1];
    doc.font('Helvetica-Bold').fontSize(11).text(student.roll ?? '—', x, currentY + 20, {
      width: rollColumn.width,
      align: 'center',
    });
    doc.font('Helvetica').fontSize(11);
    x += rollColumn.width;

    const nameColumn = columns[2];
    const studentName = student.name || 'Sem nome';
    doc.text(studentName, x + 4, currentY + 14, {
      width: nameColumn.width - 8,
      align: 'left',
    });
    if (student.email) {
      doc.fontSize(9).fillColor('#64748b').text(student.email, x + 4, currentY + 32, {
        width: nameColumn.width - 8,
        align: 'left',
      });
      doc.fontSize(11).fillColor('black');
    }
    x += nameColumn.width;

    const gradeEntries = student.grades || {};

    const collectedScores = [];

    termColumns.forEach((col) => {
      const grade = gradeEntries[String(col.term)];
      const colWidth = col.width;
      let scoreText = '—';
      if (grade && Number.isFinite(Number(grade.score))) {
        const numericScore = Number(grade.score);
        collectedScores.push(numericScore);
        const formatted = formatScore(numericScore);
        if (formatted) {
          scoreText = formatted;
        }
      }

      doc.text(scoreText, x, currentY + 18, {
        width: colWidth,
        align: 'center',
      });

      if (grade && grade.status && grade.status !== 'FREQUENTE') {
        doc.fontSize(8).fillColor('#475569').text(grade.status, x, currentY + 34, {
          width: colWidth,
          align: 'center',
        });
        doc.fontSize(11).fillColor('black');
      }

      x += colWidth;
    });

    if (includeTotal) {
      const sumColumn = columns[columns.length - 1];
      const hasScores = collectedScores.length > 0;
      const total = collectedScores.reduce((acc, value) => acc + value, 0);
      const sumText = hasScores ? formatScore(total) || '—' : '—';
      doc.text(sumText, x, currentY + 18, {
        width: sumColumn.width,
        align: 'center',
      });
    }

    currentY += rowHeight;
  });

  return doc;
}

function normalizeTeacherMeta(doc, options = {}) {
  const responsibleId = options.responsibleTeacherId ? String(options.responsibleTeacherId) : null;
  const subjects = Array.isArray(doc?.subjects)
    ? doc.subjects.filter((value) => typeof value === 'string' && value.trim())
    : [];

  return {
    id: String(doc?._id || doc?.id || ''),
    _id: String(doc?._id || doc?.id || ''),
    name: typeof doc?.name === 'string' ? doc.name : '',
    email: typeof doc?.email === 'string' ? doc.email : '',
    phone: typeof doc?.phone === 'string' ? doc.phone : undefined,
    photoUrl: typeof doc?.photoUrl === 'string' ? doc.photoUrl : undefined,
    subjects,
    responsible: responsibleId ? String(doc?._id) === responsibleId : false,
  };
}

async function buildTeachersPayload(klass) {
  const teacherIds = collectTeacherIdsFromClass(klass);
  if (!teacherIds.length) {
    return { teacherIds: [], teachers: [], responsibleTeacherId: klass?.responsibleTeacherId ? String(klass.responsibleTeacherId) : null };
  }

  const teachers = await Teacher.find({ _id: { $in: teacherIds } })
    .select('name email phone photoUrl subjects')
    .lean();

  const teacherMap = new Map(teachers.map((teacher) => [String(teacher._id), teacher]));
  const normalized = teacherIds.map((id) => {
    const meta = teacherMap.get(String(id)) || { _id: id };
    return normalizeTeacherMeta(meta, { responsibleTeacherId: klass?.responsibleTeacherId });
  });

  return {
    teacherIds: teacherIds.map(String),
    teachers: normalized,
    responsibleTeacherId: klass?.responsibleTeacherId ? String(klass.responsibleTeacherId) : null,
  };
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}

// Get all classes
router.get('/', async (req, res, next) => {
  try {
    const [classes, counts] = await Promise.all([
      Class.find()
        .select('name subject year series letter discipline schedule teachers teacherIds responsibleTeacherId studentsCount')
        .lean({ virtuals: true }),
      Student.aggregate([
        { $match: { class: { $ne: null } } },
        { $group: { _id: '$class', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = counts.reduce((acc, cur) => {
      if (cur && cur._id) {
        acc[String(cur._id)] = cur.count || 0;
      }
      return acc;
    }, {});

    const enriched = classes.map((cls) => {
      const teacherIds = collectTeacherIdsFromClass(cls);
      const teachersCount = teacherIds.length;
      const { teachers, teacherIds: storedTeacherIds, responsibleTeacherId, _id, studentsCount, name, subject, year, ...rest } = cls;
      const storedCount = typeof studentsCount === 'number' ? studentsCount : undefined;
      const computedCount = countMap[String(_id)];
      return {
        id: String(_id),
        _id: String(_id),
        name: name || (cls.series && cls.letter ? `${cls.series}${cls.letter}` : ''),
        subject: subject || cls.discipline,
        year,
        ...rest,
        teachersCount,
        studentsCount: storedCount ?? computedCount ?? 0,
        responsibleTeacherId: responsibleTeacherId ? String(responsibleTeacherId) : null,
        teacherIds: teacherIds.map(String),
      };
    });

    res.status(200).json({
      success: true,
      message: 'Turmas obtidas com sucesso',
      data: enriched
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar turmas';
    next(err);
  }
});

router.get('/:id/calendar', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const cls = await Class.findById(id)
      .select('activities milestones')
      .lean();

    if (!cls) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }

    const events = [];

    if (Array.isArray(cls.activities)) {
      cls.activities
        .map(sanitizeActivityRecord)
        .filter(Boolean)
        .forEach((activity) => {
          const dateISO = normalizeCalendarDate(activity.dateISO) || normalizeCalendarDate(activity.createdAt);
          if (!dateISO) return;
          events.push({
            id: String(activity.id),
            sourceId: String(activity.id),
            type: 'activity',
            title: activity.title,
            dateISO,
            createdAt: normalizeCalendarDate(activity.createdAt) || dateISO,
          });
        });
    }

    if (Array.isArray(cls.milestones)) {
      cls.milestones
        .map(sanitizeMilestoneRecord)
        .filter(Boolean)
        .forEach((milestone) => {
          const dateISO = normalizeCalendarDate(milestone.dateISO);
          if (!dateISO) return;
          events.push({
            id: String(milestone.id),
            sourceId: String(milestone.id),
            type: 'milestone',
            title: milestone.label,
            dateISO,
            createdAt: dateISO,
          });
        });
    }

    events.sort((a, b) => {
      const tsA = new Date(a.dateISO).getTime();
      const tsB = new Date(b.dateISO).getTime();
      return tsA - tsB;
    });

    res.status(200).json({
      success: true,
      message: 'Calendário da turma obtido com sucesso',
      data: events,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar calendário da turma';
    }
    next(err);
  }
});

router.get('/:id/grades', authRequired, ensureTeacher, ensureClassTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const year = parseYearParam(req.query?.year);
    const terms = parseTermsParam(req.query?.terms);

    const klass = await Class.findById(id)
      .select('name subject discipline series letter year')
      .lean();

    if (!klass) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }

    const students = await buildClassGradesMatrix(id, year, terms);
    const sortedStudents = [...students].sort((a, b) => {
      const rollA = typeof a.roll === 'number' ? a.roll : Number.POSITIVE_INFINITY;
      const rollB = typeof b.roll === 'number' ? b.roll : Number.POSITIVE_INFINITY;
      if (rollA !== rollB) return rollA - rollB;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    const classPayload = {
      id: String(klass._id),
      name: klass.name || '',
      subject: klass.subject || '',
      discipline: klass.discipline || '',
      series: klass.series ?? null,
      letter: klass.letter || '',
      year: klass.year ?? null,
    };

    res.status(200).json({
      success: true,
      message: 'Notas da turma obtidas com sucesso',
      data: {
        class: classPayload,
        year,
        terms,
        students: sortedStudents,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar notas da turma';
    }
    next(err);
  }
});

router.get('/:id/grades/export.pdf', authRequired, ensureTeacher, ensureClassTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const year = parseYearParam(req.query?.year);
    const terms = parseTermsParam(req.query?.terms);
  const includeTotal = toBoolean(req.query?.sum ?? req.query?.includeTotal);

    const klass = await Class.findById(id)
      .select('name subject discipline series letter year')
      .lean();

    if (!klass) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }

    const students = await buildClassGradesMatrix(id, year, terms);
    const sortedStudents = [...students].sort((a, b) => {
      const rollA = typeof a.roll === 'number' ? a.roll : Number.POSITIVE_INFINITY;
      const rollB = typeof b.roll === 'number' ? b.roll : Number.POSITIVE_INFINITY;
      if (rollA !== rollB) return rollA - rollB;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    const doc = createClassGradesPdf({
      classInfo: klass,
      students: sortedStudents,
      year,
      terms,
  includeTotal,
    });

    const rawName = formatClassDisplayName(klass).toLowerCase();
    const normalizedName = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'turma';
    const filename = `${normalizedName}-notas-${year}.pdf`;

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = doc.pipe(res);

    const handleStreamError = (error) => {
      const err = error instanceof Error ? error : new Error('Erro ao exportar notas da turma');
      if (!err.status) {
        err.status = 500;
        err.message = 'Erro ao exportar notas da turma';
      }
      if (!res.headersSent) {
        res.status(err.status).json({ success: false, message: err.message });
      } else if (!res.writableEnded) {
        res.end();
      }
    };

    doc.on('error', handleStreamError);
    stream.on('error', handleStreamError);

    doc.end();
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao exportar notas da turma';
    }
    next(err);
  }
});

router.post('/:id/email', authRequired, ensureTeacher, ensureClassTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const subject = toTrimmedString(req.body?.subject);
    const htmlInput = toTrimmedString(req.body?.html);
    const textInput = toTrimmedString(req.body?.text);
    const copyTeachers = normalizeBooleanFlag(req.body?.copyTeachers ?? req.body?.includeTeachers);

    if (!subject) {
      const error = new Error('Informe o assunto do e-mail.');
      error.status = 400;
      throw error;
    }

    let html = htmlInput;
    if (!html && textInput) {
      html = textToHtml(textInput);
    }

    if (!html) {
      const error = new Error('Informe a mensagem do e-mail.');
      error.status = 400;
      throw error;
    }

    const recipientsPayload = await collectClassRecipients(id, { copyTeachers });
    const summary = summarizeRecipientsMap(recipientsPayload.recipients);

    if (summary.emails.length === 0) {
      const error = new Error('Turma sem e-mails cadastrados.');
      error.status = 400;
      throw error;
    }

    const replyTo = toTrimmedString(req.body?.replyTo) || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER;
    const text = textInput || htmlToPlainText(html);

    await dispatchBccEmails(summary.emails, {
      subject,
      html,
      text: text || undefined,
      replyTo: replyTo || undefined,
    });

    res.json({
      success: true,
      sent: summary.emails.length,
      stats: {
        students: summary.students,
        teachers: summary.teachers,
        copyTeachers,
      },
      skipped: {
        studentsWithoutEmail: recipientsPayload.missingStudents,
        teachersWithoutEmail: recipientsPayload.missingTeachers,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao enviar e-mail para a turma';
    }
    next(err);
  }
});

router.post('/email-bulk', authRequired, ensureTeacher, async (req, res, next) => {
  try {
    const subject = toTrimmedString(req.body?.subject);
    const htmlInput = toTrimmedString(req.body?.html);
    const textInput = toTrimmedString(req.body?.text);
    const copyTeachers = normalizeBooleanFlag(req.body?.copyTeachers ?? req.body?.includeTeachers);

    if (!subject) {
      const error = new Error('Informe o assunto do e-mail.');
      error.status = 400;
      throw error;
    }

    let html = htmlInput;
    if (!html && textInput) {
      html = textToHtml(textInput);
    }

    if (!html) {
      const error = new Error('Informe a mensagem do e-mail.');
      error.status = 400;
      throw error;
    }

    const explicitClassIds = Array.isArray(req.body?.classIds) ? req.body.classIds : [];
    const explicitEmails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const legacyRecipients = Array.isArray(req.body?.recipients)
      ? req.body.recipients
      : Array.isArray(req.body?.to)
        ? req.body.to
        : [];

    const classIdSet = new Set();
    const manualEmailSet = new Set();

    explicitClassIds.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        classIdSet.add(value.trim());
      }
    });

    explicitEmails.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        manualEmailSet.add(value.trim());
      }
    });

    legacyRecipients.forEach((value) => {
      if (typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (isValidObjectId(trimmed)) {
        classIdSet.add(trimmed);
      } else {
        manualEmailSet.add(trimmed);
      }
    });

    const invalidClassIds = [];
    const validClassIds = [];
    classIdSet.forEach((value) => {
      if (isValidObjectId(value)) {
        validClassIds.push(value);
      } else {
        invalidClassIds.push(value);
      }
    });

    if (invalidClassIds.length) {
      const error = new Error(`Turma inválida: ${invalidClassIds[0]}`);
      error.status = 400;
      throw error;
    }

    if (!validClassIds.length && manualEmailSet.size === 0) {
      const error = new Error('Informe ao menos uma turma ou e-mail.');
      error.status = 400;
      throw error;
    }

    for (const classId of validClassIds) {
      const access = await resolveClassAccess(classId, req.user);
      if (!access?.ok) {
        const error = new Error('Acesso restrito aos professores da turma.');
        error.status = 403;
        throw error;
      }
    }

    const combinedRecipients = new Map();
    const missingStudents = new Set();
    const missingTeachers = new Set();

    for (const classId of validClassIds) {
      const payload = await collectClassRecipients(classId, { copyTeachers });
      mergeRecipientMaps(combinedRecipients, payload.recipients);
      payload.missingStudents.forEach((item) => missingStudents.add(item));
      payload.missingTeachers.forEach((item) => missingTeachers.add(item));
    }

    const invalidManualEmails = [];
    manualEmailSet.forEach((value) => {
      appendRecipient(combinedRecipients, {
        email: value,
        role: 'manual',
        onInvalid: ({ value: invalidValue }) => {
          invalidManualEmails.push(invalidValue);
        },
      });
    });

    if (invalidManualEmails.length) {
      const error = new Error(`Destinatário inválido: ${invalidManualEmails[0]}`);
      error.status = 400;
      throw error;
    }

    const summary = summarizeRecipientsMap(combinedRecipients);

    if (summary.emails.length === 0) {
      const error = new Error('Nenhum destinatário válido.');
      error.status = 400;
      throw error;
    }

    const replyTo = toTrimmedString(req.body?.replyTo) || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER;
    const text = textInput || htmlToPlainText(html);

    await dispatchBccEmails(summary.emails, {
      subject,
      html,
      text: text || undefined,
      replyTo: replyTo || undefined,
    });

    res.json({
      success: true,
      sent: summary.emails.length,
      stats: {
        students: summary.students,
        teachers: summary.teachers,
        copyTeachers,
        classes: validClassIds.length,
      },
      skipped: {
        studentsWithoutEmail: Array.from(missingStudents),
        teachersWithoutEmail: Array.from(missingTeachers),
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao enviar e-mails das turmas';
    }
    next(err);
  }
});

// Get class by id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const cls = await Class.findById(id)
      .select('name subject year series letter discipline schedule teachers teacherIds responsibleTeacherId studentsCount activities milestones notices')
      .lean();
    if (!cls) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }

    const [students, teacherPayload] = await Promise.all([
      Student.find({ class: id })
        .select('name rollNumber email photo')
        .sort('name')
        .lean(),
      buildTeachersPayload(cls),
    ]);

    const storedCount = typeof cls.studentsCount === 'number' ? cls.studentsCount : undefined;
    const data = {
      id: String(cls._id),
      _id: String(cls._id),
      name: cls.name || (cls.series && cls.letter ? `${cls.series}${cls.letter}` : ''),
  subject: cls.subject || cls.discipline,
      year: cls.year,
      series: cls.series,
      letter: cls.letter,
  discipline: cls.discipline || cls.subject,
      schedule: cls.schedule || [],
      activities: Array.isArray(cls.activities)
        ? cls.activities.map(sanitizeActivityRecord).filter(Boolean)
        : [],
      milestones: Array.isArray(cls.milestones)
        ? cls.milestones.map(sanitizeMilestoneRecord).filter(Boolean)
        : [],
      notices: Array.isArray(cls.notices)
        ? cls.notices.map(sanitizeNoticeRecord).filter(Boolean)
        : [],
      students: students.map((s) => ({
        id: String(s._id),
        name: s.name,
        rollNumber: s.rollNumber,
        email: s.email,
        photo: s.photo,
      })),
      teachers: teacherPayload.teachers,
      teacherIds: teacherPayload.teacherIds,
      responsibleTeacherId: teacherPayload.responsibleTeacherId,
      studentsCount: storedCount ?? students.length,
      teachersCount: teacherPayload.teacherIds.length,
    };
    res.status(200).json({
      success: true,
      message: 'Turma obtida com sucesso',
      data
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar turma';
    }
    next(err);
  }
});

// Create / Update / Delete class (novo controller preservando compatibilidade)
router.post('/', authRequired, classesController.createClass);
router.patch('/:id', authRequired, classesController.updateClass);
router.put('/:id', classesController.updateClass);
router.put('/:id/schedule', authRequired, ensureTeacher, ensureClassTeacher, classesController.updateSchedule);
router.patch('/:id/schedule', authRequired, ensureTeacher, ensureClassTeacher, classesController.updateSchedule);
router.delete('/:id', classesController.deleteClass);

// Join class as teacher
router.post('/:id/join-as-teacher', authRequired, ensureTeacher, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Turma inválida' });
    }
    const cls = await Class.findByIdAndUpdate(
      id,
      { $addToSet: { teachers: req.user._id, teacherIds: req.user._id } },
      { new: true }
    ).populate('teachers');
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Turma não encontrada' });
    }
    res.json({ success: true, message: 'Agora você é professor desta turma', data: cls });
  } catch (err) {
    next(err);
  }
});

// List students of a class
router.get('/:id/students', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }
    const students = await Student.find({ class: id })
      .select('name email rollNumber phone photo')
      .sort('name')
      .lean();
    res.status(200).json({
      success: true,
      message: 'Alunos obtidos com sucesso',
      data: Array.isArray(students) ? students.map(sanitizeStudent).filter(Boolean) : []
    });
  } catch (err) {
    err.status = 400;
    err.message = 'Erro ao buscar alunos';
    next(err);
  }
});

// Create student for a class
router.post(
  '/:classId/students',
  authRequired,
  upload.single('photo'),
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('rollNumber').optional({ checkFalsy: true }).isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0]?.msg || 'Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { classId } = req.params;
      if (!isValidObjectId(classId)) {
        const error = new Error('ID inválido');
        error.status = 400;
        throw error;
      }

      const rollNumberRaw = req.body.rollNumber ?? req.body.number;
      const rollNumber = rollNumberRaw !== undefined && String(rollNumberRaw).trim() !== ''
        ? Number(rollNumberRaw)
        : undefined;
      if (rollNumber !== undefined && Number.isNaN(rollNumber)) {
        const error = new Error('Número de chamada inválido');
        error.status = 400;
        throw error;
      }

      const name = req.body.name?.trim();
      const phone = req.body.phone ? String(req.body.phone).trim() : undefined;
      const lowerEmail = req.body.email.toLowerCase();
      const generatePassword = toBoolean(req.body.generatePassword);
      const sendInvite = toBoolean(req.body.sendInvite);
      let plainPassword = req.body.password;
      if (!plainPassword && generatePassword) {
        plainPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      }
      if (!plainPassword) {
        const error = new Error('Informe uma senha ou selecione gerar senha automaticamente');
        error.status = 400;
        throw error;
      }

      const existing = await Student.findOne({ email: lowerEmail });
      if (existing) {
        const error = new Error('Email já cadastrado');
        error.status = 400;
        throw error;
      }

      const studentData = {
        class: classId,
        rollNumber,
        name,
        email: lowerEmail,
        phone,
        passwordHash: await bcrypt.hash(plainPassword, 10),
      };
      if (req.file) {
        studentData.photo = req.file.buffer.toString('base64');
      }

      const newStudent = await Student.create(studentData);
      const safe = sanitizeStudent(newStudent);
      const studentsCount = await syncStudentsCount(classId);

      if (sendInvite) {
        try {
          await sendEmail({
            to: lowerEmail,
            subject: 'Bem-vindo ao Portal Professor Yago',
            html: `<!DOCTYPE html><p>Olá ${name || ''},</p><p>Você foi cadastrado no portal Professor Yago.</p><p>Use o email <strong>${lowerEmail}</strong> e a senha <strong>${plainPassword}</strong> para acessar.</p>`,
          });
        } catch (emailErr) {
          console.error('Falha ao enviar convite de aluno', emailErr);
        }
      }

      const meta = { studentsCount };
      if (!sendInvite) {
        meta.temporaryPassword = plainPassword;
      }

      res.status(201).json({
        success: true,
        message: 'Aluno criado com sucesso',
        data: safe,
        meta,
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao criar aluno';
      }
      next(err);
    }
  }
);

// Update student for a class
router.patch(
  '/:classId/students/:studentId',
  authRequired,
  upload.single('photo'),
  [
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('rollNumber').optional({ checkFalsy: true }).isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0]?.msg || 'Dados inválidos');
        error.status = 400;
        throw error;
      }
      const { classId, studentId } = req.params;
      if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
        const error = new Error('ID inválido');
        error.status = 400;
        throw error;
      }

      const rollNumberRaw = req.body.rollNumber ?? req.body.number;
      const updates = {};
      if (rollNumberRaw !== undefined) {
        if (String(rollNumberRaw).trim() === '') {
          updates.rollNumber = undefined;
        } else {
          const parsedRoll = Number(rollNumberRaw);
          if (Number.isNaN(parsedRoll)) {
            const error = new Error('Número de chamada inválido');
            error.status = 400;
            throw error;
          }
          updates.rollNumber = parsedRoll;
        }
      }

      if (req.body.name !== undefined) {
        updates.name = String(req.body.name).trim();
      }

      let lowerEmail;
      if (req.body.email !== undefined && String(req.body.email).trim() !== '') {
        lowerEmail = String(req.body.email).toLowerCase();
        const existing = await Student.findOne({ email: lowerEmail, _id: { $ne: studentId } });
        if (existing) {
          const error = new Error('Email já cadastrado');
          error.status = 400;
          throw error;
        }
        updates.email = lowerEmail;
      }

      if (req.body.phone !== undefined) {
        const phone = String(req.body.phone).trim();
        updates.phone = phone || undefined;
      }

      const unset = {};
      if (req.file) {
        updates.photo = req.file.buffer.toString('base64');
      } else if (toBoolean(req.body.removePhoto)) {
        unset.photo = '';
      }

      const generatePassword = toBoolean(req.body.generatePassword);
      const sendInvite = toBoolean(req.body.sendInvite);
      let plainPassword = req.body.password;
      if (!plainPassword && generatePassword) {
        plainPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      }
      if (plainPassword) {
        updates.passwordHash = await bcrypt.hash(plainPassword, 10);
      }

      if (Object.keys(updates).length === 0 && Object.keys(unset).length === 0) {
        const error = new Error('Nenhuma alteração fornecida');
        error.status = 400;
        throw error;
      }

      const student = await Student.findOneAndUpdate(
        { _id: studentId, class: classId },
        Object.keys(unset).length ? { $set: updates, $unset: unset } : { $set: updates },
        { new: true }
      );
      if (!student) {
        const error = new Error('Aluno não encontrado');
        error.status = 404;
        throw error;
      }

      const safe = sanitizeStudent(student);
      const studentsCount = await syncStudentsCount(classId);

      if (plainPassword && sendInvite) {
        try {
          await sendEmail({
            to: (lowerEmail || student.email),
            subject: 'Sua senha foi atualizada',
            html: `<!DOCTYPE html><p>Olá ${student.name || ''},</p><p>Sua senha foi atualizada.</p><p>Nova senha: <strong>${plainPassword}</strong></p>`,
          });
        } catch (emailErr) {
          console.error('Falha ao enviar email de atualização de aluno', emailErr);
        }
      }

      const meta = { studentsCount };
      if (plainPassword && !sendInvite) {
        meta.temporaryPassword = plainPassword;
      }

      res.status(200).json({
        success: true,
        message: 'Aluno atualizado com sucesso',
        data: safe,
        meta,
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao atualizar aluno';
      }
      next(err);
    }
  }
);

router.get(
  '/:classId/students/:studentId/grades',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentGradesController.listStudentGrades
);

router.post(
  '/:classId/students/:studentId/grades',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentGradesController.upsertStudentGrade
);

router.get(
  '/:classId/students/:studentId/notes',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentNotesController.listStudentNotes
);

router.post(
  '/:classId/students/:studentId/notes',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentNotesController.createStudentNote
);

router.patch(
  '/:classId/students/:studentId/notes/:noteId',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentNotesController.updateStudentNote
);

router.delete(
  '/:classId/students/:studentId/notes/:noteId',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentNotesController.deleteStudentNote
);

router.post(
  '/:classId/activities',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.addActivity
);

router.delete(
  '/:classId/activities/:activityId',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.removeActivity
);

router.post(
  '/:classId/milestones',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.addMilestone
);

router.delete(
  '/:classId/milestones/:milestoneId',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.removeMilestone
);

router.post(
  '/:classId/notices',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.addNotice
);

router.delete(
  '/:classId/notices/:noticeId',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  classQuickActionsController.removeNotice
);

router.post(
  '/:classId/students/:studentId/email',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  studentEmailController.sendStudentEmail
);

router.get(
  '/:id/teachers',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Turma inválida.' });
      }

      const klass = await Class.findById(id)
        .select('teacherIds teachers responsibleTeacherId')
        .lean();
      if (!klass) {
        return res.status(404).json({ success: false, message: 'Turma não encontrada.' });
      }

      const payload = await buildTeachersPayload(klass);
      res.json({
        success: true,
        data: payload.teachers,
        meta: {
          teacherIds: payload.teacherIds,
          responsibleTeacherId: payload.responsibleTeacherId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id/responsible',
  authRequired,
  ensureTeacher,
  ensureClassTeacher,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { teacherId } = req.body || {};

      if (!isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Turma inválida.' });
      }

      if (!teacherId || !isValidObjectId(String(teacherId))) {
        return res.status(400).json({ success: false, message: 'Professor inválido.' });
      }

      const teacher = await Teacher.findById(teacherId)
        .select('_id name email phone photoUrl subjects')
        .lean();
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Professor não encontrado.' });
      }

      const klass = await Class.findById(id);
      if (!klass) {
        return res.status(404).json({ success: false, message: 'Turma não encontrada.' });
      }

      const teacherIdString = String(teacher._id);
      klass.responsibleTeacherId = teacher._id;

      const currentSet = new Set(collectTeacherIdsFromClass(klass));
      currentSet.add(teacherIdString);
      klass.teacherIds = Array.from(currentSet);
      klass.teachers = Array.from(currentSet);

      await klass.save();

      const payload = await buildTeachersPayload(klass.toObject());
      res.json({
        success: true,
        message: 'Professor responsável atualizado com sucesso.',
        data: payload.teachers,
        meta: {
          teacherIds: payload.teacherIds,
          responsibleTeacherId: payload.responsibleTeacherId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete student from a class
router.delete(
  '/:classId/students/:studentId',
  authRequired,
  async (req, res, next) => {
    try {
      const { classId, studentId } = req.params;
      if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
        const error = new Error('ID inválido');
        error.status = 400;
        throw error;
      }
      const result = await Student.deleteOne({ _id: studentId, class: classId });
      if (result.deletedCount === 0) {
        const error = new Error('Aluno não encontrado');
        error.status = 404;
        throw error;
      }
      const studentsCount = await syncStudentsCount(classId);
      res.status(200).json({
        success: true,
        message: 'Aluno removido com sucesso',
        data: { id: studentId },
        meta: { studentsCount },
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao remover aluno';
      }
      next(err);
    }
  }
);

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BATCH_SIZE = 50;

function chunk(list, size) {
  if (!Array.isArray(list) || size <= 0) return [];
  const batches = [];
  for (let i = 0; i < list.length; i += size) {
    batches.push(list.slice(i, i + size));
  }
  return batches;
}

async function resolveClassRecipients(classId, copyTeachers) {
  // Resolve class roster emails and optionally include the teaching staff.
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    const error = new Error('Turma inválida');
    error.status = 400;
    throw error;
  }

  const classDoc = await Class.findById(classId)
    .select('students teacherIds teachers responsibleTeacherId')
    .lean();
  if (!classDoc) {
    const error = new Error('Turma não encontrada');
    error.status = 404;
    throw error;
  }

  const studentDocs = await Student.find({ class: classDoc._id })
    .select('email')
    .lean();
  const emails = studentDocs.map((student) => student.email).filter(Boolean);

  if (copyTeachers) {
    const teacherIds = new Set();
    const candidates = [];
    if (Array.isArray(classDoc.teacherIds)) candidates.push(...classDoc.teacherIds);
    if (Array.isArray(classDoc.teachers)) candidates.push(...classDoc.teachers);
    if (classDoc.responsibleTeacherId) candidates.push(classDoc.responsibleTeacherId);
    candidates.forEach((id) => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        teacherIds.add(String(id));
      }
    });
    if (teacherIds.size) {
      const teacherDocs = await Teacher.find({ _id: { $in: Array.from(teacherIds) } })
        .select('email')
        .lean();
      emails.push(...teacherDocs.map((teacher) => teacher.email).filter(Boolean));
    }
  }

  return emails;
}

async function sendEmailHandler(req, res) {
  try {
    const {
      subject,
      html,
      recipients,
      classId,
      copyTeachers = false,
      to,
    } = req.body || {};

    if (typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ message: 'Assunto obrigatório' });
    }

    if (typeof html !== 'string' || !html.trim()) {
      return res.status(400).json({ message: 'Conteúdo do e-mail obrigatório' });
    }

    const rawRecipients = typeof recipients === 'undefined' ? to : recipients;

    if (typeof rawRecipients !== 'undefined' && !Array.isArray(rawRecipients)) {
      return res.status(400).json({ message: 'Campo "recipients" deve ser um array' });
    }

    const shouldCopyTeachers = typeof copyTeachers === 'string'
      ? copyTeachers.toLowerCase() === 'true'
      : Boolean(copyTeachers);

    const classIds = new Set();
    if (classId) classIds.add(classId);

    const manualEmails = [];
    const invalidRecipients = [];
    if (Array.isArray(rawRecipients)) {
      rawRecipients.forEach((value) => {
        if (typeof value !== 'string') {
          invalidRecipients.push(value);
          return;
        }
        const trimmed = value.trim();
        if (!trimmed) {
          invalidRecipients.push(value);
          return;
        }
        if (!trimmed.includes('@') && mongoose.Types.ObjectId.isValid(trimmed)) {
          classIds.add(trimmed);
          return;
        }
        if (EMAIL_REGEX.test(trimmed)) {
          manualEmails.push(trimmed);
          return;
        }
        invalidRecipients.push(value);
      });
    }

    if (invalidRecipients.length) {
      const sample = invalidRecipients[0];
      const detail = typeof sample === 'string' ? sample : JSON.stringify(sample);
      return res.status(400).json({ message: `Destinatário inválido: ${detail}` });
    }

    let emails = manualEmails.slice();
    for (const id of classIds) {
      const classEmails = await resolveClassRecipients(id, shouldCopyTeachers);
      emails.push(...classEmails);
    }

    emails = Array.from(new Set(emails.map((email) => (typeof email === 'string' ? email.trim() : ''))))
      .filter((email) => EMAIL_REGEX.test(email));

    if (!emails.length) {
      return res.status(400).json({ message: 'Nenhum destinatário válido' });
    }

    const replyTo = process.env.EMAIL_REPLY_TO || process.env.SMTP_USER;

    const batches = chunk(emails, BATCH_SIZE);
    for (let index = 0; index < batches.length; index += 1) {
      const bcc = batches[index];
      await sendEmail({ bcc, subject, html, replyTo });
      if (index < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    res.json({ ok: true, sent: emails.length });
  } catch (err) {
    console.error('[email] send failure', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Erro ao enviar e-mail' });
  }
}

router.post('/', sendEmailHandler);
router.post('/send', sendEmailHandler);

module.exports = router;

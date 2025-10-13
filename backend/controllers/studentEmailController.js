const { isValidObjectId } = require('mongoose');
const Student = require('../models/Student');
const { sendEmail } = require('../services/emailService');

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

async function ensureStudentInClass(classId, studentId) {
  const student = await Student.findOne({ _id: studentId, class: classId })
    .select('email name')
    .lean();
  if (!student) {
    const error = new Error('Aluno não encontrado na turma informada.');
    error.status = 404;
    throw error;
  }
  if (!student.email) {
    const error = new Error('Aluno sem e-mail cadastrado.');
    error.status = 400;
    throw error;
  }
  return student;
}

exports.sendStudentEmail = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const subject = toTrimmedString(req.body.subject);
    const htmlInput = toTrimmedString(req.body.html);
    const textInput = toTrimmedString(req.body.text);
    const scheduleAtRaw = toTrimmedString(req.body.scheduleAt);

    if (!subject) {
      const error = new Error('Informe o assunto do e-mail.');
      error.status = 400;
      throw error;
    }

    if (!htmlInput && !textInput) {
      const error = new Error('Informe a mensagem do e-mail.');
      error.status = 400;
      throw error;
    }

    let scheduleAtIso = null;
    if (scheduleAtRaw) {
      const parsed = new Date(scheduleAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        const error = new Error('Formato de scheduleAt inválido.');
        error.status = 400;
        throw error;
      }
      scheduleAtIso = parsed.toISOString();
    }

    const student = await ensureStudentInClass(classId, studentId);

    const plainText = textInput || (htmlInput ? htmlInput.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
    const fallbackHtml = textInput ? textToHtml(textInput) : '';
    const html = htmlInput || fallbackHtml;

    const info = await sendEmail({
      to: student.email,
      subject,
      html: html || undefined,
      text: plainText || undefined,
    });

    res.status(200).json({
      success: true,
      message: scheduleAtIso ? 'Agendamento ainda não disponível; e-mail enviado imediatamente.' : 'E-mail enviado com sucesso.',
      data: {
        scheduled: false,
        scheduleAt: scheduleAtIso,
        messageId: info?.messageId || null,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao enviar e-mail para o aluno';
    }
    next(err);
  }
};

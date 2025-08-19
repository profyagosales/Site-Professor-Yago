const express = require('express');
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

function isEmail(value) {
  return typeof value === 'string' && /\S+@\S+\.\S+/.test(value);
}

router.post('/send', async (req, res, next) => {
  try {
    const { to, subject, html } = req.body;
    if (!Array.isArray(to)) {
      const error = new Error('Campo "to" deve ser um array');
      error.status = 400;
      throw error;
    }

    const recipients = new Set();
    for (const item of to) {
      if (mongoose.Types.ObjectId.isValid(item)) {
        const cls = await Class.findById(item).lean();
        if (!cls) {
          const error = new Error(`Turma não encontrada: ${item}`);
          error.status = 400;
          throw error;
        }
        const students = await Student.find({ class: item }).select('email').lean();
        students.forEach(student => {
          if (student.email) {
            recipients.add(student.email);
          }
        });
      } else if (isEmail(item)) {
        recipients.add(item);
      } else {
        const error = new Error(`Destinatário inválido: ${item}`);
        error.status = 400;
        throw error;
      }
    }

    await sendEmail({ to: Array.from(recipients), subject, html });
    res.status(200).json({
      success: true,
      message: 'Email enviado com sucesso',
      data: null
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao enviar email';
    }
    next(err);
  }
});

module.exports = router;

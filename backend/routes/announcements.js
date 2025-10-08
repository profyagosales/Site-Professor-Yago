const express = require('express');
const authRequired = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const router = express.Router();

// Cria aviso
router.post('/', authRequired, async (req, res, next) => {
  try {
    if (!req.user || req.profile !== 'teacher') {
      const err = new Error('Apenas professores podem criar avisos');
      err.status = 403; throw err;
    }
    const { message, classIds, extraEmails, scheduledFor } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      const err = new Error('Campo "message" é obrigatório');
      err.status = 400; throw err;
    }
    // Validação rápida de professor
    const teacherExists = await Teacher.findById(req.user.id).select('_id').lean();
    if (!teacherExists) {
      const err = new Error('Professor não encontrado');
      err.status = 404; throw err;
    }
    const doc = await Announcement.create({
      message: message.trim(),
      teacher: req.user.id,
      classIds: Array.isArray(classIds) ? classIds : [],
      extraEmails: Array.isArray(extraEmails) ? extraEmails : [],
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
});

// Lista avisos de um professor (paginado)
router.get('/teacher/:teacherId', authRequired, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const q = { teacher: teacherId };
    const [items, total] = await Promise.all([
      Announcement.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Announcement.countDocuments(q),
    ]);
    res.json({ success: true, data: items, total, limit, skip });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
});

// Lista avisos relevantes para um aluno (match por turmas)
router.get('/student/:studentId', authRequired, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).select('class').lean();
    if (!student) {
      const err = new Error('Aluno não encontrado');
      err.status = 404; throw err;
    }
    const classId = student.class; // campo único de turma do aluno
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const q = { $or: [ { classIds: { $size: 0 } }, { classIds: classId } ] };
    const [items, total] = await Promise.all([
      Announcement.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Announcement.countDocuments(q),
    ]);
    res.json({ success: true, data: items, total, limit, skip });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
});

module.exports = router;

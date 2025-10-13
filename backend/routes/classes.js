const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { isValidObjectId } = require('mongoose');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { sendEmail } = require('../services/emailService');
const classesController = require('../controllers/classesController');
const studentGradesController = require('../controllers/studentGradesController');
const studentNotesController = require('../controllers/studentNotesController');
const studentEmailController = require('../controllers/studentEmailController');
const classQuickActionsController = require('../controllers/classQuickActionsController');

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
  return {
    id: String(entry._id),
    _id: String(entry._id),
    message: typeof entry.message === 'string' ? entry.message : '',
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
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
        .select('name subject year series letter discipline schedule teachers studentsCount')
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
      const teachersCount = Array.isArray(cls.teachers) ? cls.teachers.length : 0;
      const { teachers, _id, studentsCount, name, subject, year, ...rest } = cls;
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
      .select('name subject year series letter discipline schedule teachers studentsCount activities milestones notices')
      .lean();
    if (!cls) {
      const error = new Error('Turma não encontrada');
      error.status = 404;
      throw error;
    }

    const [students, teachers] = await Promise.all([
      Student.find({ class: id })
        .select('name rollNumber email photo')
        .sort('name')
        .lean(),
      (Array.isArray(cls.teachers) && cls.teachers.length
        ? Teacher.find({ _id: { $in: cls.teachers } })
            .select('name email subjects')
            .lean()
        : Promise.resolve([]))
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
      teachers: teachers.map((t) => ({
        id: String(t._id),
        name: t.name,
        email: t.email,
        subjects: Array.isArray(t.subjects) ? t.subjects : [],
      })),
      studentsCount: storedCount ?? students.length,
      teachersCount: Array.isArray(cls.teachers) ? cls.teachers.length : 0,
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
router.delete('/:id', classesController.deleteClass);

// Join class as teacher
router.post('/:id/join-as-teacher', authRequired, async (req, res, next) => {
  try {
    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { teachers: req.user._id } },
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
  studentGradesController.listStudentGrades
);

router.post(
  '/:classId/students/:studentId/grades',
  authRequired,
  ensureTeacher,
  studentGradesController.upsertStudentGrade
);

router.get(
  '/:classId/students/:studentId/notes',
  authRequired,
  ensureTeacher,
  studentNotesController.listStudentNotes
);

router.post(
  '/:classId/students/:studentId/notes',
  authRequired,
  ensureTeacher,
  studentNotesController.createStudentNote
);

router.patch(
  '/:classId/students/:studentId/notes/:noteId',
  authRequired,
  ensureTeacher,
  studentNotesController.updateStudentNote
);

router.delete(
  '/:classId/students/:studentId/notes/:noteId',
  authRequired,
  ensureTeacher,
  studentNotesController.deleteStudentNote
);

router.post(
  '/:classId/activities',
  authRequired,
  ensureTeacher,
  classQuickActionsController.addActivity
);

router.delete(
  '/:classId/activities/:activityId',
  authRequired,
  ensureTeacher,
  classQuickActionsController.removeActivity
);

router.post(
  '/:classId/milestones',
  authRequired,
  ensureTeacher,
  classQuickActionsController.addMilestone
);

router.delete(
  '/:classId/milestones/:milestoneId',
  authRequired,
  ensureTeacher,
  classQuickActionsController.removeMilestone
);

router.post(
  '/:classId/notices',
  authRequired,
  ensureTeacher,
  classQuickActionsController.addNotice
);

router.delete(
  '/:classId/notices/:noticeId',
  authRequired,
  ensureTeacher,
  classQuickActionsController.removeNotice
);

router.post(
  '/:classId/students/:studentId/email',
  authRequired,
  ensureTeacher,
  studentEmailController.sendStudentEmail
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

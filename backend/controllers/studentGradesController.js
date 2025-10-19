const mongoose = require('mongoose');
const GradeActivity = require('../models/GradeActivity');
const StudentActivityGrade = require('../models/StudentActivityGrade');
const Student = require('../models/Student');
const { resolveClassAccess } = require('../services/acl');

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

async function ensureClassAccess(classId, req) {
  const access = await resolveClassAccess(classId, req.user);
  if (!access.ok) {
    const error = new Error('Acesso restrito aos professores da turma.');
    error.status = access.reason === 'class-not-found' ? 404 : 403;
    throw error;
  }
  return access.classRef;
}

async function ensureStudentInClass(classId, studentId) {
  const exists = await Student.exists({ _id: studentId, class: classId });
  if (!exists) {
    const error = new Error('Aluno não pertence a esta turma.');
    error.status = 404;
    throw error;
  }
}

function parseYear(raw) {
  const now = new Date();
  const fallback = now.getFullYear();
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 3000) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseBimester(raw) {
  if (raw === undefined || raw === null || raw === '') {
    const currentMonth = new Date().getMonth();
    return Math.min(4, Math.max(1, Math.floor(currentMonth / 3) + 1));
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 4) {
    const error = new Error('Bimestre inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function clampScore(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 10) return 10;
  return Number(value.toFixed(2));
}

exports.listStudentGrades = async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    const studentId = toObjectId(req.params.studentId);
    if (!classId || !studentId) {
      const error = new Error('IDs inválidos.');
      error.status = 400;
      throw error;
    }

    await ensureClassAccess(classId, req);
    await ensureStudentInClass(classId, studentId);

    const year = parseYear(req.query.year);
    const bimester = parseBimester(req.query.bimester);

    const activities = await GradeActivity.find({
      classId,
      year,
      active: true,
    })
      .sort({ bimester: 1, order: 1, label: 1 })
      .lean();

    const activitiesByBimester = new Map();
    activities.forEach((activity) => {
      const list = activitiesByBimester.get(activity.bimester) || [];
      list.push(activity);
      activitiesByBimester.set(activity.bimester, list);
    });

    const activityIds = activities.map((activity) => activity._id);
    const gradeDocs = activityIds.length
      ? await StudentActivityGrade.find({
          classId,
          studentId,
          activityId: { $in: activityIds },
        })
          .select('activityId points')
          .lean()
      : [];

    const gradeMap = new Map();
    gradeDocs.forEach((grade) => {
      gradeMap.set(String(grade.activityId), Number(grade.points ?? 0));
    });

    const activitiesForBimester = activitiesByBimester.get(bimester) || [];
    const activitiesPayload = activitiesForBimester.map((activity) => {
      const key = String(activity._id);
      const points = clampScore(gradeMap.get(key) ?? 0);
      return {
        activityId: key,
        label: activity.label,
        value: Number(activity.value ?? 0),
        points,
      };
    });

    const totalBimester = clampScore(
      activitiesPayload.reduce((acc, entry) => acc + (entry.points || 0), 0)
    );
    const missingFor5 = Math.max(0, Number((5 - totalBimester).toFixed(2)));

    const totalsByBimester = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const [bim, list] of activitiesByBimester.entries()) {
      const total = list.reduce((acc, activity) => {
        const key = String(activity._id);
        const points = clampScore(gradeMap.get(key) ?? 0);
        return acc + points;
      }, 0);
      totalsByBimester[bim] = clampScore(total);
    }

    const annualTotal = clampScore(
      Object.values(totalsByBimester).reduce((acc, value) => acc + value, 0)
    );
    const missingFor20 = Math.max(0, Number((20 - annualTotal).toFixed(2)));

    res.json({
      success: true,
      data: {
        classId: String(classId),
        studentId: String(studentId),
        year,
        bimester,
        activities: activitiesPayload,
        totalBimester,
        missingFor5,
        annualTotal,
        missingFor20,
        totalsByBimester,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao carregar notas do aluno.';
    }
    next(err);
  }
};

exports.upsertStudentGrade = async (_req, res) => {
  res.status(410).json({
    success: false,
    message: 'Endpoint substituído. Utilize POST /api/grade-activities/:id/grades.',
  });
};

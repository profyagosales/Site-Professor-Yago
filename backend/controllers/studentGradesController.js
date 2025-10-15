const { isValidObjectId } = require('mongoose');
const Student = require('../models/Student');
const StudentGrade = require('../models/StudentGrade');
const GradeActivity = require('../models/GradeActivity');

const VALID_STATUSES = StudentGrade.STATUS_VALUES || ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'];

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 10) return 10;
  return Number(value.toFixed(2));
}

function sanitizeActivity(entry) {
  if (!entry) return null;
  const activityDoc = entry.activity && typeof entry.activity === 'object' ? entry.activity : null;
  const id = activityDoc ? activityDoc._id || activityDoc.id : entry.activity;
  const weight = Number(entry.weight ?? activityDoc?.weight ?? 0);
  const maxScore = Number(entry.maxScore ?? activityDoc?.maxScore ?? weight);
  const score = Number(entry.score ?? 0);
  const rawDate = entry.activityDate || activityDoc?.dueDate;
  const recordedAt = entry.recordedAt instanceof Date ? entry.recordedAt.toISOString() : entry.recordedAt || null;

  return {
    id: id ? String(id) : undefined,
    title: entry.activityTitle || activityDoc?.title || 'Atividade',
    kind: entry.activityKind || activityDoc?.kind || 'ATIVIDADE',
    date: rawDate instanceof Date ? rawDate.toISOString() : rawDate || null,
    weight: Number.isFinite(weight) ? weight : 0,
    maxScore: Number.isFinite(maxScore) ? maxScore : Number.isFinite(weight) ? weight : 0,
    score: Number.isFinite(score) ? Number(score.toFixed(2)) : 0,
    recordedAt,
  };
}

function sanitizeGrade(doc) {
  if (!doc) return null;
  const activities = Array.isArray(doc.activities)
    ? doc.activities.map((activity) => sanitizeActivity(activity)).filter(Boolean)
    : [];
  const totalScore = clampScore(doc.score ?? activities.reduce((acc, entry) => acc + (entry?.score || 0), 0));

  return {
    id: String(doc._id),
    _id: String(doc._id),
    class: String(doc.class),
    student: String(doc.student),
    year: Number(doc.year),
    term: Number(doc.term),
    score: totalScore,
    activities,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

async function ensureStudentInClass(classId, studentId) {
  const exists = await Student.exists({ _id: studentId, class: classId });
  if (!exists) {
    const error = new Error('Aluno não pertence a esta turma.');
    error.status = 404;
    throw error;
  }
}

exports.listStudentGrades = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const grades = await StudentGrade.find({ class: classId, student: studentId })
      .sort({ year: 1, term: 1 })
      .populate('activities.activity')
      .lean({ virtuals: true });

    const sanitized = grades
      .map((grade) => sanitizeGrade(grade))
      .filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Notas obtidas com sucesso',
      data: sanitized,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar notas do aluno';
    }
    next(err);
  }
};

function validateActivitiesInput(activities, { classId, year, term, activityDocs }) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  const byId = new Map(activityDocs.map((doc) => [String(doc._id), doc]));
  return activities.map((entry) => {
    const activityId = String(entry.activityId || entry.activity || '');
    if (!isValidObjectId(activityId)) {
      const error = new Error('Atividade inválida.');
      error.status = 400;
      throw error;
    }

    const activityDoc = byId.get(activityId);
    if (!activityDoc) {
      const error = new Error('Atividade não encontrada para a turma.');
      error.status = 404;
      throw error;
    }

    if (String(activityDoc.class) !== String(classId) || activityDoc.year !== year || activityDoc.term !== term) {
      const error = new Error('Atividade não pertence ao bimestre informado.');
      error.status = 400;
      throw error;
    }

    const score = Number(entry.score);
    if (!Number.isFinite(score) || score < 0) {
      const error = new Error('Pontuação da atividade inválida.');
      error.status = 400;
      throw error;
    }

    const snapshot = {
      activity: activityDoc._id,
      activityTitle: activityDoc.title,
      activityKind: activityDoc.kind || 'ATIVIDADE',
      activityDate: activityDoc.dueDate || null,
      weight: activityDoc.weight,
      maxScore: activityDoc.maxScore ?? activityDoc.weight,
      score: Number(score.toFixed(2)),
      recordedAt: new Date(),
    };

    if (snapshot.score > snapshot.maxScore) {
      const error = new Error('A pontuação não pode exceder o valor máximo da atividade.');
      error.status = 400;
      throw error;
    }

    return snapshot;
  });
}

exports.upsertStudentGrade = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const year = Number(req.body.year);
    const term = Number(req.body.term);
    const status = String(req.body.status || '').trim().toUpperCase();

    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      const error = new Error('Ano inválido');
      error.status = 400;
      throw error;
    }

    if (![1, 2, 3, 4].includes(term)) {
      const error = new Error('Bimestre inválido');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const activitiesInput = Array.isArray(req.body.activities) ? req.body.activities : [];
    let activityDocs = [];
    if (activitiesInput.length) {
      const ids = activitiesInput
        .map((entry) => String(entry.activityId || entry.activity || ''))
        .filter((value) => isValidObjectId(value));
      activityDocs = await GradeActivity.find({ _id: { $in: ids } }).lean();
    }

    const grade = await StudentGrade.findOne({ class: classId, student: studentId, year, term });
    const doc =
      grade ||
      new StudentGrade({
        class: classId,
        student: studentId,
        year,
        term,
        score: 0,
        status: 'FREQUENTE',
        activities: [],
      });

    if (activitiesInput.length) {
      const snapshots = validateActivitiesInput(activitiesInput, { classId, year, term, activityDocs });
      doc.activities = snapshots;
      doc.recalculateScore();
    } else if (req.body.score !== undefined) {
      doc.score = clampScore(Number(req.body.score));
    }

    if (status) {
      doc.status = VALID_STATUSES.includes(status) ? status : 'FREQUENTE';
    }

    await doc.save();
    await doc.populate('activities.activity');

    res.status(grade ? 200 : 201).json({
      success: true,
      message: 'Nota salva com sucesso',
      data: sanitizeGrade(doc.toObject()),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao salvar nota do aluno';
    }
    next(err);
  }
};

exports._sanitizeGradeForResponse = sanitizeGrade;

const { isValidObjectId } = require('mongoose');
const GradeActivity = require('../models/GradeActivity');
const StudentGrade = require('../models/StudentGrade');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { resolveClassAccess } = require('../services/acl');
const { _sanitizeGradeForResponse } = require('./studentGradesController');

function toId(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return undefined;
  if (typeof value === 'object' && value !== null) {
    const candidate = value._id || value.id;
    return candidate ? String(candidate) : undefined;
  }
  return undefined;
}

async function ensureTeacherAccess(req, classId) {
  const access = await resolveClassAccess(classId, req.user);
  if (!access.ok) {
    const error = new Error('Acesso restrito aos professores da turma.');
    error.status = access.reason === 'class-not-found' ? 404 : 403;
    throw error;
  }
  if (access.classRef && (access.classRef.name || access.classRef.series || access.classRef.discipline)) {
    return access.classRef;
  }
  const classDoc = await Class.findById(classId)
    .select('name series letter discipline teacherIds teachers responsibleTeacherId')
    .lean();
  return classDoc || access.classRef;
}

function parseNumber(value, { min, max, fallback } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    if (fallback !== undefined) return fallback;
    return NaN;
  }
  if (min !== undefined && parsed < min) return NaN;
  if (max !== undefined && parsed > max) return NaN;
  return parsed;
}

function parseDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function buildClassLabel(doc) {
  if (!doc) return '';
  const parts = [];
  if (doc.name) {
    parts.push(doc.name);
  } else {
    if (doc.series) {
      parts.push(`${doc.series}º${doc.letter ?? ''}`.trim());
    }
    if (doc.discipline) {
      parts.push(doc.discipline);
    }
  }
  return parts.filter(Boolean).join(' • ');
}

function sanitizeActivity(doc, classInfo) {
  if (!doc) return null;
  const maxScore = Number(doc.maxScore ?? doc.weight ?? 0);
  const dueDate = doc.dueDate instanceof Date ? doc.dueDate.toISOString() : doc.dueDate || null;
  return {
    id: String(doc._id),
    classId: toId(doc.class),
    className: buildClassLabel(classInfo),
    year: doc.year,
    term: doc.term,
    title: doc.title,
    description: doc.description || '',
    kind: doc.kind || 'ATIVIDADE',
    weight: Number(doc.weight ?? 0),
    maxScore: Number.isFinite(maxScore) ? maxScore : Number(doc.weight ?? 0),
    dueDate,
    order: doc.order ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
  };
}

async function assertWeightCap({ classId, year, term, weight, excludeId }) {
  const filters = { class: classId, year, term };
  if (excludeId) {
    filters._id = { $ne: excludeId };
  }
  const existing = await GradeActivity.find(filters).select('weight').lean();
  const total = existing.reduce((acc, entry) => acc + Number(entry.weight ?? 0), 0);
  if (total + weight > 10.0001) {
    const error = new Error('A soma dos pesos das atividades do bimestre não pode ultrapassar 10 pontos.');
    error.status = 400;
    throw error;
  }
}

async function getActivityScores(req, res, next) {
  try {
    const { classId, activityId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(activityId)) {
      const error = new Error('Identificadores inválidos.');
      error.status = 400;
      throw error;
    }

    const classDoc = await ensureTeacherAccess(req, classId);
    const activity = await GradeActivity.findById(activityId).lean();
    if (!activity || String(activity.class) !== String(classId)) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    const grades = await StudentGrade.find({
      class: classId,
      year: activity.year,
      term: activity.term,
      'activities.activity': activity._id,
    })
      .select('_id student status activities')
      .lean();

    const scores = grades
      .map((grade) => {
        const entry = Array.isArray(grade.activities)
          ? grade.activities.find((snapshot) => String(snapshot.activity) === String(activity._id))
          : null;
        if (!entry) return null;
        const numeric = Number(entry.score ?? 0);
        const score = Number.isFinite(numeric) ? numeric : 0;
        const recordedAt = entry.recordedAt instanceof Date
          ? entry.recordedAt.toISOString()
          : entry.recordedAt || null;
        return {
          studentId: String(grade.student),
          gradeId: grade._id ? String(grade._id) : undefined,
          score,
          status: typeof grade.status === 'string' ? grade.status : 'FREQUENTE',
          recordedAt,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        activity: sanitizeActivity(activity, classDoc),
        scores,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao carregar notas da atividade.';
    }
    next(err);
  }
}

exports.getActivityScores = getActivityScores;

exports.listActivities = async (req, res, next) => {
  try {
    const { classId } = req.params;
    if (!isValidObjectId(classId)) {
      const error = new Error('Turma inválida.');
      error.status = 400;
      throw error;
    }

    const classDoc = await ensureTeacherAccess(req, classId);

    const year = parseNumber(req.query.year, { min: 1900, max: 3000, fallback: new Date().getFullYear() });
    const termFilter = req.query.term !== undefined ? parseNumber(req.query.term, { min: 1, max: 4 }) : undefined;
    if (Number.isNaN(year)) {
      const error = new Error('Ano inválido.');
      error.status = 400;
      throw error;
    }
    if (req.query.term !== undefined && Number.isNaN(termFilter)) {
      const error = new Error('Bimestre inválido.');
      error.status = 400;
      throw error;
    }

    const filters = { class: classId, year };
    if (termFilter) {
      filters.term = termFilter;
    }

    const activities = await GradeActivity.find(filters).sort({ term: 1, order: 1, dueDate: 1 }).lean();

    res.json({
      success: true,
      data: activities.map((activity) => sanitizeActivity(activity, classDoc)),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao listar atividades avaliativas.';
    }
    next(err);
  }
};

exports.createActivity = async (req, res, next) => {
  try {
    const { classId } = req.params;
    if (!isValidObjectId(classId)) {
      const error = new Error('Turma inválida.');
      error.status = 400;
      throw error;
    }

    const classDoc = await ensureTeacherAccess(req, classId);

    const titleRaw = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const year = parseNumber(req.body.year, { min: 1900, max: 3000, fallback: new Date().getFullYear() });
    const term = parseNumber(req.body.term, { min: 1, max: 4 });
    const weight = parseNumber(req.body.weight, { min: 0, max: 10 });
    const maxScore = req.body.maxScore !== undefined ? parseNumber(req.body.maxScore, { min: 0, max: 10 }) : weight;
    const dueDate = parseDate(req.body.dueDate);
    const order = parseNumber(req.body.order, { min: 0, fallback: 0 });
    const kind = typeof req.body.kind === 'string' ? req.body.kind.trim().toUpperCase() : 'ATIVIDADE';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!titleRaw) {
      const error = new Error('Informe o título da atividade.');
      error.status = 400;
      throw error;
    }
    if (Number.isNaN(year) || Number.isNaN(term) || Number.isNaN(weight)) {
      const error = new Error('Parâmetros de data ou peso inválidos.');
      error.status = 400;
      throw error;
    }
    if (Number.isNaN(maxScore)) {
      const error = new Error('Valor máximo da atividade inválido.');
      error.status = 400;
      throw error;
    }
    if (weight <= 0) {
      const error = new Error('O peso da atividade deve ser maior que zero.');
      error.status = 400;
      throw error;
    }
    if (maxScore < weight) {
      const error = new Error('O valor máximo da atividade não pode ser menor que o peso.');
      error.status = 400;
      throw error;
    }

    await assertWeightCap({ classId, year, term, weight });

    const activity = await GradeActivity.create({
      class: classId,
      year,
      term,
      title: titleRaw,
      description,
      kind,
      weight,
      maxScore,
      dueDate,
      order,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Atividade criada com sucesso.',
      data: sanitizeActivity(activity, classDoc),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao criar atividade avaliativa.';
    }
    next(err);
  }
};

exports.updateActivity = async (req, res, next) => {
  try {
    const { classId, activityId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(activityId)) {
      const error = new Error('Identificadores inválidos.');
      error.status = 400;
      throw error;
    }

    const classDoc = await ensureTeacherAccess(req, classId);
    const activity = await GradeActivity.findById(activityId);
    if (!activity || String(activity.class) !== String(classId)) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    const updates = {};
    if (req.body.title !== undefined) {
      const title = String(req.body.title || '').trim();
      if (!title) {
        const error = new Error('Informe o título da atividade.');
        error.status = 400;
        throw error;
      }
      updates.title = title;
    }
    if (req.body.description !== undefined) {
      updates.description = String(req.body.description || '').trim();
    }
    if (req.body.kind !== undefined) {
      updates.kind = String(req.body.kind || '').trim().toUpperCase() || 'ATIVIDADE';
    }
    if (req.body.dueDate !== undefined) {
      const dueDate = parseDate(req.body.dueDate);
      if (req.body.dueDate && !dueDate) {
        const error = new Error('Data da atividade inválida.');
        error.status = 400;
        throw error;
      }
      updates.dueDate = dueDate;
    }
    if (req.body.order !== undefined) {
      const order = parseNumber(req.body.order, { min: 0, fallback: 0 });
      if (Number.isNaN(order)) {
        const error = new Error('Ordem inválida.');
        error.status = 400;
        throw error;
      }
      updates.order = order;
    }

    let weightToApply;
    if (req.body.weight !== undefined) {
      const weight = parseNumber(req.body.weight, { min: 0, max: 10 });
      if (Number.isNaN(weight) || weight <= 0) {
        const error = new Error('Peso da atividade inválido.');
        error.status = 400;
        throw error;
      }
      weightToApply = weight;
      updates.weight = weight;
    }

    if (req.body.maxScore !== undefined) {
      const maxScore = parseNumber(req.body.maxScore, { min: 0, max: 10 });
      if (Number.isNaN(maxScore)) {
        const error = new Error('Valor máximo da atividade inválido.');
        error.status = 400;
        throw error;
      }
      if (weightToApply !== undefined && maxScore < weightToApply) {
        const error = new Error('O valor máximo não pode ser menor que o peso.');
        error.status = 400;
        throw error;
      }
      updates.maxScore = maxScore;
    }

    if (weightToApply !== undefined) {
      await assertWeightCap({ classId, year: activity.year, term: activity.term, weight: weightToApply, excludeId: activity._id });
    }

    Object.assign(activity, updates, { updatedBy: req.user?._id });
    await activity.save();

    if (updates.title || updates.kind || updates.dueDate || updates.weight || updates.maxScore) {
      const payload = {
        ...(updates.title ? { 'activities.$[elem].activityTitle': updates.title } : {}),
        ...(updates.kind ? { 'activities.$[elem].activityKind': updates.kind } : {}),
        ...(updates.dueDate !== undefined ? { 'activities.$[elem].activityDate': updates.dueDate } : {}),
        ...(updates.weight !== undefined ? { 'activities.$[elem].weight': updates.weight } : {}),
        ...(updates.maxScore !== undefined ? { 'activities.$[elem].maxScore': updates.maxScore } : {}),
      };
      if (Object.keys(payload).length) {
        await StudentGrade.updateMany(
          { class: classId, year: activity.year, term: activity.term },
          { $set: payload },
          { arrayFilters: [{ 'elem.activity': activity._id }] }
        );
      }
    }

    res.json({
      success: true,
      message: 'Atividade atualizada com sucesso.',
      data: sanitizeActivity(activity, classDoc),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao atualizar atividade avaliativa.';
    }
    next(err);
  }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    const { classId, activityId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(activityId)) {
      const error = new Error('Identificadores inválidos.');
      error.status = 400;
      throw error;
    }

    await ensureTeacherAccess(req, classId);

    const activity = await GradeActivity.findById(activityId);
    if (!activity || String(activity.class) !== String(classId)) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    await GradeActivity.deleteOne({ _id: activityId });
    await StudentGrade.updateMany(
      { class: classId, year: activity.year, term: activity.term },
      {
        $pull: {
          activities: { activity: activity._id },
        },
      }
    );

    const affectedGrades = await StudentGrade.find({ class: classId, year: activity.year, term: activity.term });
    for (const grade of affectedGrades) {
      grade.recalculateScore();
      await grade.save();
    }

    res.json({
      success: true,
      message: 'Atividade removida com sucesso.',
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover atividade avaliativa.';
    }
    next(err);
  }
};

exports.bulkUpsertScores = async (req, res, next) => {
  try {
    const { classId, activityId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(activityId)) {
      const error = new Error('Identificadores inválidos.');
      error.status = 400;
      throw error;
    }

    await ensureTeacherAccess(req, classId);

    const activity = await GradeActivity.findById(activityId).lean();
    if (!activity || String(activity.class) !== String(classId)) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    const scoresInput = Array.isArray(req.body.scores) ? req.body.scores : [];
    if (!scoresInput.length) {
      const error = new Error('Informe as notas dos alunos.');
      error.status = 400;
      throw error;
    }

    const maxScore = Number(activity.maxScore ?? activity.weight ?? 0);
    const studentIds = scoresInput
      .map((entry) => String(entry.studentId || entry.student || ''))
      .filter((value) => isValidObjectId(value));

    if (!studentIds.length) {
      const error = new Error('Nenhum aluno válido informado.');
      error.status = 400;
      throw error;
    }

    const validStudents = await Student.find({ _id: { $in: studentIds }, class: classId }).select('_id').lean();
    const validSet = new Set(validStudents.map((doc) => String(doc._id)));

    const invalid = studentIds.filter((id) => !validSet.has(id));
    if (invalid.length) {
      const error = new Error('Um ou mais alunos não pertencem à turma.');
      error.status = 400;
      throw error;
    }

    const updatedIds = [];
    for (const entry of scoresInput) {
      const studentId = String(entry.studentId || entry.student);
      if (!validSet.has(studentId)) continue;

      const rawScore = Number(entry.score);
      if (!Number.isFinite(rawScore) || rawScore < 0) {
        const error = new Error('Pontuação inválida informada.');
        error.status = 400;
        throw error;
      }
      const score = Math.min(rawScore, maxScore);

      let grade = await StudentGrade.findOne({
        class: classId,
        student: studentId,
        year: activity.year,
        term: activity.term,
      });

      if (!grade) {
        grade = new StudentGrade({
          class: classId,
          student: studentId,
          year: activity.year,
          term: activity.term,
          score: 0,
          status: 'FREQUENTE',
          activities: [],
        });
      }

      grade.replaceActivityScore({
        activity: activity._id,
        activityTitle: activity.title,
        activityKind: activity.kind || 'ATIVIDADE',
        activityDate: activity.dueDate || null,
        weight: activity.weight,
        maxScore,
        score,
        recordedAt: new Date(),
      });

      await grade.save();
      updatedIds.push(studentId);
    }

    const grades = await StudentGrade.find({
      class: classId,
      student: { $in: updatedIds },
      year: activity.year,
      term: activity.term,
    })
      .populate('activities.activity')
      .lean({ virtuals: true });

    res.json({
      success: true,
      message: 'Notas registradas com sucesso.',
      updated: grades.map((entry) => _sanitizeGradeForResponse(entry)),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao registrar notas da atividade.';
    }
    next(err);
  }
};

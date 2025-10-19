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

function getTeacherId(req) {
  const raw = req.user && (req.user._id || req.user.id);
  if (!raw) return null;
  return toObjectId(raw);
}

function parseYear(input) {
  const now = new Date();
  const fallback = now.getFullYear();
  if (input === undefined || input === null || input === '') {
    return fallback;
  }
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 3000) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseBimester(input, { optional = false } = {}) {
  if (input === undefined || input === null || input === '') {
    if (optional) return undefined;
    const error = new Error('Bimestre é obrigatório.');
    error.status = 400;
    throw error;
  }
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 4) {
    const error = new Error('Bimestre inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function sanitizeActivity(doc) {
  if (!doc) return null;
  const json = doc.toObject ? doc.toObject() : doc;
  const result = {
    id: String(json._id),
    classId: String(json.classId),
    year: json.year,
    bimester: json.bimester,
    label: json.label,
    value: Number(json.value ?? 0),
    order: Number(json.order ?? 0),
    active: Boolean(json.active),
  };
  if (json.createdBy) {
    result.createdBy = String(json.createdBy);
  }
  if (json.createdAt instanceof Date) {
    result.createdAt = json.createdAt.toISOString();
  } else if (typeof json.createdAt === 'string') {
    result.createdAt = json.createdAt;
  }
  if (json.updatedAt instanceof Date) {
    result.updatedAt = json.updatedAt.toISOString();
  } else if (typeof json.updatedAt === 'string') {
    result.updatedAt = json.updatedAt;
  }
  return result;
}

async function validateBimesterSum({ classId, year, bimester, candidateValue, excludeId }) {
  const filters = {
    classId,
    year,
    bimester,
    active: true,
  };
  if (excludeId) {
    filters._id = { $ne: excludeId };
  }
  const existing = await GradeActivity.find(filters).select('value').lean();
  const total = existing.reduce((acc, entry) => acc + Number(entry?.value ?? 0), 0);
  if (total + candidateValue > 10 + 1e-6) {
    const error = new Error('Soma de valores do bimestre excede 10');
    error.status = 400;
    throw error;
  }
}

function parseValue(input) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
    const error = new Error('Valor deve estar entre 0 e 10.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseOrder(input) {
  if (input === undefined || input === null || input === '') return 0;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
}

exports.listGradeActivities = async (req, res, next) => {
  try {
    const rawClassId = req.query.classId;
    if (!rawClassId) {
      const error = new Error('classId é obrigatório.');
      error.status = 400;
      throw error;
    }
    const classId = toObjectId(rawClassId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    await ensureClassAccess(classId, req);
    const year = parseYear(req.query.year);
    const bimester = parseBimester(req.query.bimester, { optional: true });

    const filters = { classId, year, active: true };
    if (bimester !== undefined) {
      filters.bimester = bimester;
    }

    const activities = await GradeActivity.find(filters)
      .sort({ bimester: 1, order: 1, label: 1 })
      .lean();

    res.json({
      success: true,
      data: activities.map(sanitizeActivity),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao listar atividades avaliativas.';
    }
    next(err);
  }
};

exports.createGradeActivity = async (req, res, next) => {
  try {
    const rawClassId = req.body.classId;
    const classId = toObjectId(rawClassId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }
    await ensureClassAccess(classId, req);

    const year = parseYear(req.body.year);
    const bimester = parseBimester(req.body.bimester);
    const label =
      typeof req.body.label === 'string' && req.body.label.trim()
        ? req.body.label.trim()
        : null;
    if (!label) {
      const error = new Error('Descrição da atividade é obrigatória.');
      error.status = 400;
      throw error;
    }

    const value = parseValue(req.body.value);
    const order = parseOrder(req.body.order);
    await validateBimesterSum({ classId, year, bimester, candidateValue: value });

    const teacherId = getTeacherId(req);
    const payload = {
      classId,
      year,
      bimester,
      label,
      value,
      order,
      active: true,
    };
    if (teacherId) {
      payload.createdBy = teacherId;
    }

    const activity = await GradeActivity.create(payload);
    res.status(201).json({
      success: true,
      data: sanitizeActivity(activity),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao criar atividade avaliativa.';
    }
    next(err);
  }
};

exports.updateGradeActivity = async (req, res, next) => {
  try {
    const activityId = toObjectId(req.params.id);
    if (!activityId) {
      const error = new Error('Atividade inválida.');
      error.status = 400;
      throw error;
    }

    const activity = await GradeActivity.findById(activityId);
    if (!activity || activity.active === false) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    await ensureClassAccess(activity.classId, req);

    let classId = activity.classId;
    let year = activity.year;
    let bimester = activity.bimester;
    let label = activity.label;
    let value = activity.value;
    let order = activity.order;

    if (req.body.classId !== undefined) {
      const parsedClassId = toObjectId(req.body.classId);
      if (!parsedClassId) {
        const error = new Error('classId inválido.');
        error.status = 400;
        throw error;
      }
      await ensureClassAccess(parsedClassId, req);
      classId = parsedClassId;
      activity.classId = parsedClassId;
    }

    if (req.body.year !== undefined) {
      year = parseYear(req.body.year);
      activity.year = year;
    }

    if (req.body.bimester !== undefined) {
      bimester = parseBimester(req.body.bimester);
      activity.bimester = bimester;
    }

    if (req.body.label !== undefined) {
      const trimmed = typeof req.body.label === 'string' ? req.body.label.trim() : '';
      if (!trimmed) {
        const error = new Error('Descrição da atividade é obrigatória.');
        error.status = 400;
        throw error;
      }
      label = trimmed;
      activity.label = trimmed;
    }

    if (req.body.value !== undefined) {
      value = parseValue(req.body.value);
      activity.value = value;
    }

    if (req.body.order !== undefined) {
      order = parseOrder(req.body.order);
      activity.order = order;
    }

    await validateBimesterSum({
      classId,
      year,
      bimester,
      candidateValue: value,
      excludeId: activityId,
    });

    activity.updatedAt = new Date();
    await activity.save();

    res.json({
      success: true,
      data: sanitizeActivity(activity),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao atualizar atividade avaliativa.';
    }
    next(err);
  }
};

exports.deleteGradeActivity = async (req, res, next) => {
  try {
    const activityId = toObjectId(req.params.id);
    if (!activityId) {
      const error = new Error('Atividade inválida.');
      error.status = 400;
      throw error;
    }

    const activity = await GradeActivity.findById(activityId);
    if (!activity || activity.active === false) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    await ensureClassAccess(activity.classId, req);

    activity.active = false;
    activity.updatedAt = new Date();
    await activity.save();

    res.json({
      success: true,
      data: sanitizeActivity(activity),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao excluir atividade avaliativa.';
    }
    next(err);
  }
};

exports.bulkSetActivityGrades = async (req, res, next) => {
  try {
    const activityId = toObjectId(req.params.id);
    if (!activityId) {
      const error = new Error('Atividade inválida.');
      error.status = 400;
      throw error;
    }

    const activity = await GradeActivity.findById(activityId).lean();
    if (!activity || activity.active === false) {
      const error = new Error('Atividade não encontrada.');
      error.status = 404;
      throw error;
    }

    await ensureClassAccess(activity.classId, req);

    const gradesPayload = Array.isArray(req.body?.grades) ? req.body.grades : null;
    if (!gradesPayload || gradesPayload.length === 0) {
      const error = new Error('grades deve conter ao menos um registro.');
      error.status = 400;
      throw error;
    }

    const seen = new Map();
    gradesPayload.forEach((entry) => {
      const studentId = toObjectId(entry.studentId);
      if (!studentId) return;
      const points = Number(entry.points);
      if (!Number.isFinite(points) || points < 0 || points > activity.value) {
        return;
      }
      seen.set(String(studentId), {
        studentId,
        points: Number(points.toFixed(2)),
      });
    });

    if (seen.size === 0) {
      const error = new Error('Nenhuma nota válida encontrada.');
      error.status = 400;
      throw error;
    }

    const studentIds = Array.from(seen.values()).map((entry) => entry.studentId);
    const allowedStudents = await Student.find({
      _id: { $in: studentIds },
      class: activity.classId,
    })
      .select('_id')
      .lean();
    const allowed = new Set(allowedStudents.map((s) => String(s._id)));

    const invalid = studentIds.filter((id) => !allowed.has(String(id)));
    if (invalid.length > 0) {
      const error = new Error('Alguns alunos não pertencem à turma informada.');
      error.status = 400;
      throw error;
    }

    const teacherId = getTeacherId(req);
    const now = new Date();

    const operations = Array.from(seen.values()).map(({ studentId, points }) => {
      const update = {
        classId: activity.classId,
        studentId,
        activityId,
        points,
        gradedAt: now,
      };
      if (teacherId) {
        update.gradedBy = teacherId;
      }
      return {
        updateOne: {
          filter: { classId: activity.classId, studentId, activityId },
          update: { $set: update },
          upsert: true,
        },
      };
    });

    await StudentActivityGrade.bulkWrite(operations, { ordered: false });

    const storedGrades = await StudentActivityGrade.find({
      classId: activity.classId,
      activityId,
      studentId: { $in: studentIds },
    })
      .select('studentId points gradedAt')
      .lean();

    const payload = storedGrades.map((grade) => ({
      studentId: String(grade.studentId),
      points: Number(grade.points ?? 0),
      gradedAt:
        grade.gradedAt instanceof Date
          ? grade.gradedAt.toISOString()
          : grade.gradedAt || now.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        activity: sanitizeActivity(activity),
        grades: payload,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao registrar notas da atividade.';
    }
    next(err);
  }
};

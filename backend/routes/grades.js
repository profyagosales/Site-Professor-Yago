const express = require('express');
const mongoose = require('mongoose');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Class = require('../models/Class');
const GradePlan = require('../models/GradePlan');
const Score = require('../models/Score');
const pdfReport = require('../utils/pdfReport');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const ensureStudent = require('../middleware/ensureStudent');
const { resolveClassAccess } = require('../services/acl');
const {
  getGradesTable,
  exportGradesTablePdf,
} = require('../controllers/gradesTableController');

const router = express.Router();

router.use(authRequired);

router.get('/me', ensureStudent, async (req, res, next) => {
  try {
    const studentId = toObjectId(req.auth?.sub || req.auth?.userId || req.user?._id || req.user?.id);
    if (!studentId) {
      const error = new Error('Aluno não identificado.');
      error.status = 403;
      throw error;
    }

    let classId = toObjectId(req.query?.classId ?? req.auth?.classId);
    if (!classId) {
      const student = await Student.findById(studentId).select('class').lean();
      classId = toObjectId(student?.class);
    }

    if (!classId) {
      return res.json({
        success: true,
        data: {
          gradePlan: null,
          scores: [],
          totals: { 1: 0, 2: 0, 3: 0, 4: 0 },
          totalYear: 0,
        },
      });
    }

    await ensureStudentBelongsToClass(studentId, classId);

    const year = parseYearParam(req.query?.year);
    const [plan, scores] = await Promise.all([
      GradePlan.findOne({ classId, year }).lean(),
      Score.find({ classId, studentId, year }).lean(),
    ]);

    const sanitizedScores = scores.map((doc) => ({
      term: doc.term,
      activityId: String(doc.activityId),
      score: Number(doc.score ?? 0),
    }));

    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    sanitizedScores.forEach((entry) => {
      const key = String(entry.term);
      const current = totals[key] ?? 0;
      totals[key] = Number((current + entry.score).toFixed(2));
    });
    const totalYear = Number(
      Object.values(totals).reduce((acc, value) => acc + value, 0).toFixed(2)
    );

    res.json({
      success: true,
      data: {
        gradePlan: sanitizeGradePlanDoc(plan),
        scores: sanitizedScores,
        totals,
        totalYear,
      },
    });
  } catch (err) {
    next(err);
  }
});

const tableRouter = express.Router();
tableRouter.use(authRequired);
tableRouter.use(ensureTeacher);
tableRouter.get('/classes/:classId/grades/table', getGradesTable);
tableRouter.get('/classes/:classId/grades/export/pdf', exportGradesTablePdf);

const classesRouter = express.Router();
classesRouter.use(authRequired);

classesRouter.post('/classes/:classId/grade-plan', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    await ensureTeacherClassAccess(req, classId);

    const year = parseYearParam(req.body?.year ?? req.query?.year);
    let plan = null;

    if (req.body?.term !== undefined) {
      const term = parseTermParam(req.body.term);
      const activities = normalizeTermActivities(req.body?.activities ?? req.body?.terms ?? []);
      plan = await GradePlan.findOneAndUpdate(
        { classId, year },
        {
          $set: { [`terms.${term}`]: activities },
          $setOnInsert: { classId, year },
        },
        { upsert: true, new: true, runValidators: true }
      );
    } else if (req.body?.terms !== undefined) {
      const normalized = normalizeTermsPayload(req.body.terms);
      plan = await GradePlan.findOneAndUpdate(
        { classId, year },
        {
          $set: { terms: normalized },
          $setOnInsert: { classId, year },
        },
        { upsert: true, new: true, runValidators: true }
      );
    } else {
      const error = new Error('Informe os termos do plano de notas.');
      error.status = 400;
      throw error;
    }

    res.json({ success: true, data: sanitizeGradePlanDoc(plan) });
  } catch (err) {
    next(err);
  }
});

classesRouter.get('/classes/:classId/grade-plan', async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    const year = parseYearParam(req.query?.year);
    const role = (req.auth?.role || req.user?.role || '').toString().toLowerCase();

    if (role === 'student') {
      const studentId = toObjectId(req.auth?.sub || req.auth?.userId || req.user?._id || req.user?.id);
      if (!studentId) {
        const error = new Error('Aluno não identificado.');
        error.status = 403;
        throw error;
      }
      await ensureStudentBelongsToClass(studentId, classId);
    } else {
      await ensureTeacherClassAccess(req, classId);
    }

    const plan = await GradePlan.findOne({ classId, year }).lean();
    res.json({ success: true, data: sanitizeGradePlanDoc(plan) });
  } catch (err) {
    next(err);
  }
});

classesRouter.post('/classes/:classId/grade-plan/:term/activities', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    const term = parseTermParam(req.params.term);
    const year = parseYearParam(req.body?.year ?? req.query?.year);
    await ensureTeacherClassAccess(req, classId);

    const nameSource = req.body?.name ?? req.body?.title;
    const name = typeof nameSource === 'string' ? nameSource.trim() : '';
    if (!name) {
      const error = new Error('Nome da atividade é obrigatório.');
      error.status = 400;
      throw error;
    }
    const points = clampScore(req.body?.points ?? req.body?.value ?? 0);

    const activity = {
      _id: new mongoose.Types.ObjectId(),
      name,
      points,
    };

    const plan = await GradePlan.findOneAndUpdate(
      { classId, year },
      {
        $push: { [`terms.${term}`]: activity },
        $setOnInsert: { classId, year },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        activity: { id: String(activity._id), name, points },
        plan: sanitizeGradePlanDoc(plan),
      },
    });
  } catch (err) {
    next(err);
  }
});

classesRouter.patch('/classes/:classId/grade-plan/:term/activities/:activityId', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    const activityId = toObjectId(req.params.activityId);
    if (!classId || !activityId) {
      const error = new Error('IDs inválidos.');
      error.status = 400;
      throw error;
    }

    const term = parseTermParam(req.params.term);
    const year = parseYearParam(req.body?.year ?? req.query?.year);
    await ensureTeacherClassAccess(req, classId);

    const updates = {};
    if (req.body?.name !== undefined || req.body?.title !== undefined) {
      const nameSource = req.body?.name ?? req.body?.title;
      const name = typeof nameSource === 'string' ? nameSource.trim() : '';
      if (!name) {
        const error = new Error('Nome da atividade é obrigatório.');
        error.status = 400;
        throw error;
      }
      updates[`terms.${term}.$.name`] = name;
    }
    if (req.body?.points !== undefined || req.body?.value !== undefined) {
      updates[`terms.${term}.$.points`] = clampScore(req.body?.points ?? req.body?.value ?? 0);
    }

    if (!Object.keys(updates).length) {
      const error = new Error('Nenhuma alteração informada.');
      error.status = 400;
      throw error;
    }

    const plan = await GradePlan.findOneAndUpdate(
      { classId, year, [`terms.${term}._id`]: activityId },
      { $set: updates },
      { new: true }
    );

    if (!plan) {
      const error = new Error('Plano ou atividade não encontrado.');
      error.status = 404;
      throw error;
    }

    const termKey = String(term);
    const termActivities = Array.isArray(plan?.terms?.[termKey]) ? plan.terms[termKey] : [];
    const updated = termActivities.find((activity) => String(activity._id) === String(activityId));

    res.json({
      success: true,
      data: {
        activity: updated
          ? { id: String(updated._id), name: updated.name, points: Number(updated.points ?? 0) }
          : null,
        plan: sanitizeGradePlanDoc(plan),
      },
    });
  } catch (err) {
    next(err);
  }
});

classesRouter.delete('/classes/:classId/grade-plan/:term/activities/:activityId', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    const activityId = toObjectId(req.params.activityId);
    if (!classId || !activityId) {
      const error = new Error('IDs inválidos.');
      error.status = 400;
      throw error;
    }

    const term = parseTermParam(req.params.term);
    const year = parseYearParam(req.query?.year ?? req.body?.year);
    await ensureTeacherClassAccess(req, classId);

    const plan = await GradePlan.findOneAndUpdate(
      { classId, year },
      { $pull: { [`terms.${term}`]: { _id: activityId } } },
      { new: true }
    );

    if (!plan) {
      const error = new Error('Plano não encontrado.');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: sanitizeGradePlanDoc(plan),
    });
  } catch (err) {
    next(err);
  }
});

classesRouter.post('/classes/:classId/scores/:term/:activityId', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    const activityId = toObjectId(req.params.activityId);
    if (!classId || !activityId) {
      const error = new Error('IDs inválidos.');
      error.status = 400;
      throw error;
    }

    const term = parseTermParam(req.params.term);
    const year = parseYearParam(req.body?.year ?? req.query?.year);
    await ensureTeacherClassAccess(req, classId);

    const plan = await GradePlan.findOne({ classId, year }).lean();
    if (!plan) {
      const error = new Error('Plano de notas não encontrado.');
      error.status = 404;
      throw error;
    }

    const termActivities = Array.isArray(plan?.terms?.[String(term)]) ? plan.terms[String(term)] : [];
    const existsInPlan = termActivities.some((activity) => String(activity._id) === String(activityId));
    if (!existsInPlan) {
      const error = new Error('Atividade não encontrada no plano informado.');
      error.status = 404;
      throw error;
    }

    const payload = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.scores)
        ? req.body.scores
        : [];

    if (!payload.length) {
      return res.json({
        success: true,
        data: { activityId: String(activityId), term, year, scores: [] },
      });
    }

    const studentIds = payload
      .map((entry) => toObjectId(entry?.studentId))
      .filter(Boolean);

    if (!studentIds.length) {
      const error = new Error('Nenhum aluno válido informado.');
      error.status = 400;
      throw error;
    }

    const students = await Student.find({ _id: { $in: studentIds }, class: classId })
      .select('_id')
      .lean();
    const allowedIds = new Set(students.map((student) => String(student._id)));

    const bulkOps = [];
    const affectedStudentIds = new Set();

    payload.forEach((entry) => {
      const studentId = toObjectId(entry?.studentId);
      if (!studentId || !allowedIds.has(String(studentId))) {
        return;
      }
      const value = clampScore(entry?.score ?? entry?.value ?? 0);
      bulkOps.push({
        updateOne: {
          filter: { classId, studentId, year, term, activityId },
          update: { $set: { score: value } },
          upsert: true,
        },
      });
      affectedStudentIds.add(String(studentId));
    });

    if (bulkOps.length) {
      await Score.bulkWrite(bulkOps, { ordered: false });
    }

    const updatedScores = await Score.find({
      classId,
      year,
      term,
      activityId,
      studentId: { $in: Array.from(affectedStudentIds).map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('studentId score term activityId')
      .lean();

    const scores = updatedScores.map((doc) => ({
      studentId: String(doc.studentId),
      term: doc.term,
      activityId: String(doc.activityId),
      score: Number(doc.score ?? 0),
    }));

    res.json({
      success: true,
      data: {
        activityId: String(activityId),
        term,
        year,
        scores,
      },
    });
  } catch (err) {
    next(err);
  }
});

classesRouter.get('/classes/:classId/grades/summary', ensureTeacher, async (req, res, next) => {
  try {
    const classId = toObjectId(req.params.classId);
    if (!classId) {
      const error = new Error('classId inválido.');
      error.status = 400;
      throw error;
    }

    const year = parseYearParam(req.query?.year);
    await ensureTeacherClassAccess(req, classId);

    const [plan, scores] = await Promise.all([
      GradePlan.findOne({ classId, year }).lean(),
      Score.find({ classId, year }).lean(),
    ]);

    const stats = computeStatsFromScores(scores);

    res.json({
      success: true,
      data: {
        classId: String(classId),
        year,
        gradePlan: sanitizeGradePlanDoc(plan),
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
});

function parseBimestersParam(raw) {
  if (raw === undefined || raw === null) return [1, 2, 3, 4];
  const values = Array.isArray(raw) ? raw : String(raw).split(',');
  const unique = new Set();
  values.forEach((token) => {
    const trimmed = String(token).trim();
    if (!trimmed) return;
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 4) {
      unique.add(parsed);
    }
  });
  return unique.size ? Array.from(unique).sort((a, b) => a - b) : [1, 2, 3, 4];
}

function toMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  if (typeof value === 'object' && value._id) {
    return toObjectId(value._id);
  }
  return null;
}

function parseYearParam(raw, fallback = new Date().getFullYear()) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 3000) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseTermParam(raw) {
  if (raw === undefined || raw === null || raw === '') {
    const month = new Date().getMonth();
    return Math.min(4, Math.max(1, Math.floor(month / 3) + 1));
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    const error = new Error('Bimestre inválido.');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 10) return Number(number.toFixed(2));
  return Number(number.toFixed(2));
}

function normalizeTermActivities(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((entry) => {
      const nameSource = entry?.name ?? entry?.title;
      const name = typeof nameSource === 'string' ? nameSource.trim() : '';
      if (!name) return null;
      const pointsSource = entry?.points ?? entry?.value ?? 0;
      const points = clampScore(pointsSource);
      const rawId = entry?.id ?? entry?._id ?? null;
      const activityId = toObjectId(rawId) || new mongoose.Types.ObjectId();
      return {
        _id: activityId,
        name,
        points,
      };
    })
    .filter(Boolean);
}

function normalizeTermsPayload(rawTerms) {
  const terms = {};
  [1, 2, 3, 4].forEach((term) => {
    const key = String(term);
    const source =
      (rawTerms && (rawTerms[key] || rawTerms[term])) ||
      (Array.isArray(rawTerms) && rawTerms[term - 1]) ||
      [];
    terms[key] = normalizeTermActivities(source);
  });
  return terms;
}

function sanitizeGradePlanDoc(plan) {
  if (!plan) return null;
  const terms = {};
  [1, 2, 3, 4].forEach((term) => {
    const key = String(term);
    const list = Array.isArray(plan?.terms?.[key]) ? plan.terms[key] : [];
    terms[key] = list.map((activity) => ({
      id: String(activity._id),
      name: activity.name,
      points: Number(activity.points ?? 0),
    }));
  });
  return {
    id: String(plan._id),
    classId: String(plan.classId),
    year: plan.year,
    terms,
    updatedAt: plan.updatedAt || null,
  };
}

function computeStatsFromScores(scores) {
  const buckets = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  const activityBuckets = {
    1: new Map(),
    2: new Map(),
    3: new Map(),
    4: new Map(),
  };

  scores.forEach((score) => {
    const term = Number(score.term);
    if (!buckets[term]) return;
    const value = Number(score.score ?? 0);
    if (!Number.isFinite(value)) return;
    buckets[term].push(value);
    const activityId = String(score.activityId);
    const byActivity = activityBuckets[term];
    const current = byActivity.get(activityId) || [];
    current.push(value);
    byActivity.set(activityId, current);
  });

  const byTerm = {};
  Object.entries(buckets).forEach(([termKey, values]) => {
    if (!values.length) {
      byTerm[termKey] = { avg: 0, median: 0, n: 0 };
      return;
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    const avg = Number((sum / values.length).toFixed(2));
    const med = Number(toMedian(values).toFixed(2));
    byTerm[termKey] = { avg, median: med, n: values.length };
  });

  const byActivity = {};
  Object.entries(activityBuckets).forEach(([termKey, map]) => {
    const items = [];
    map.forEach((values, activityId) => {
      if (!values.length) return;
      const avg = Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));
      items.push({ activityId, avg, n: values.length });
    });
    byActivity[termKey] = items;
  });

  return { byTerm, byActivity };
}

async function ensureTeacherClassAccess(req, classId) {
  const access = await resolveClassAccess(classId, req.user);
  if (!access.ok) {
    const error = new Error('Acesso restrito aos professores da turma.');
    error.status = access.reason === 'class-not-found' ? 404 : 403;
    throw error;
  }
  return access.classRef;
}

async function ensureStudentBelongsToClass(studentId, classId) {
  if (!studentId || !classId) {
    const error = new Error('Aluno ou turma inválidos.');
    error.status = 400;
    throw error;
  }
  const exists = await Student.exists({ _id: studentId, class: classId });
  if (!exists) {
    const error = new Error('Aluno não pertence a esta turma.');
    error.status = 403;
    throw error;
  }
}

router.get('/summary', ensureTeacher, async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const requestedYear = Number.parseInt(req.query.year, 10) || currentYear;
    const rawBimestersParam =
      req.query.b ?? req.query.bimesters ?? req.query.bimester ?? req.query.bimestre;
    const bimesters = parseBimestersParam(rawBimestersParam);

    let classObjectId = null;
    const rawClassId = Array.isArray(req.query.classId)
      ? req.query.classId[0]
      : typeof req.query.classId === 'string'
        ? req.query.classId.trim()
        : null;

    if (rawClassId) {
      if (!mongoose.Types.ObjectId.isValid(rawClassId)) {
        const error = new Error('classId inválido.');
        error.status = 400;
        throw error;
      }
      classObjectId = new mongoose.Types.ObjectId(rawClassId);
    }

    const pipeline = [
      {
        $addFields: {
          scoreNumber: {
            $cond: [
              { $isNumber: '$score' },
              '$score',
              {
                $cond: [
                  { $ne: ['$score', null] },
                  { $toDouble: '$score' },
                  null,
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          scoreNumber: { $ne: null },
          bimester: { $in: bimesters },
        },
      },
    ];

    if (classObjectId) {
      pipeline.push(
        {
          $lookup: {
            from: 'students',
            localField: 'student',
            foreignField: '_id',
            as: 'studentDoc',
          },
        },
        {
          $addFields: {
            studentDoc: { $arrayElemAt: ['$studentDoc', 0] },
            studentClassId: { $ifNull: ['$studentDoc.class', null] },
          },
        },
        {
          $match: {
            studentClassId: classObjectId,
          },
        },
        {
          $project: {
            studentDoc: 0,
            studentClassId: 0,
          },
        }
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: 'evaluations',
          localField: 'evaluation',
          foreignField: '_id',
          as: 'evaluationDoc',
        },
      },
      {
        $addFields: {
          evaluationDoc: { $arrayElemAt: ['$evaluationDoc', 0] },
        },
      },
      {
        $addFields: {
          evaluationDates: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ['$evaluationDoc.classes', []] },
                  as: 'cls',
                  cond: { $ne: ['$$cls.date', null] },
                },
              },
              as: 'cls',
              in: '$$cls.date',
            },
          },
        },
      },
      {
        $addFields: {
          evaluationDate: {
            $cond: [
              { $gt: [{ $size: '$evaluationDates' }, 0] },
              { $min: '$evaluationDates' },
              '$createdAt',
            ],
          },
        },
      },
      {
        $addFields: {
          referenceDate: {
            $cond: [
              { $ne: ['$evaluationDate', null] },
              '$evaluationDate',
              '$createdAt',
            ],
          },
        },
      },
      {
        $addFields: {
          referenceYear: {
            $cond: [
              { $ne: ['$referenceDate', null] },
              { $year: '$referenceDate' },
              null,
            ],
          },
        },
      },
      {
        $match: {
          referenceYear: requestedYear,
        },
      },
      {
        $group: {
          _id: '$bimester',
          scores: { $push: '$scoreNumber' },
          avg: { $avg: '$scoreNumber' },
          count: { $sum: 1 },
        },
      }
    );

    const aggregation = await Grade.aggregate(pipeline);

    const statsMap = new Map();
    aggregation.forEach((entry) => {
      const scores = (entry.scores || []).filter((value) => Number.isFinite(value));
      statsMap.set(entry._id, {
        avg: typeof entry.avg === 'number' ? Number(entry.avg.toFixed(2)) : 0,
        median: Number(toMedian(scores).toFixed(2)),
        count: entry.count || 0,
      });
    });

    const series = bimesters.map((bimester) => {
      const bucket = statsMap.get(bimester);
      if (!bucket) {
        return { bimester, avg: 0, median: 0, count: 0 };
      }
      return { bimester, avg: bucket.avg, median: bucket.median, count: bucket.count };
    });

    const avgByBimester = {};
    const medianByBimester = {};
    const totalCount = series.reduce((acc, item) => {
      avgByBimester[item.bimester] = item.avg;
      medianByBimester[item.bimester] = item.median;
      return acc + item.count;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        year: requestedYear,
        bimesters,
        series,
        avgByBimester,
        medianByBimester,
        count: totalCount,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao consolidar as médias por bimestre';
    }
    next(err);
  }
});

// Get grades for a single student grouped by bimester
router.get('/student/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const grades = await Grade.find({ student: studentId });
    const grouped = grades.reduce((acc, g) => {
      acc[g.bimester] = (acc[g.bimester] || 0) + (Number(g.score) || 0);
      return acc;
    }, {});
    const bimesters = [1, 2, 3, 4].map((b) => (grouped[b] !== undefined ? grouped[b] : 0));
    const defined = bimesters.filter((v) => typeof v === 'number');
    const average = defined.length ? defined.reduce((a, b) => a + b, 0) / defined.length : 0;
    res.status(200).json({
      success: true,
      message: 'Notas do aluno obtidas com sucesso',
      data: { bimesters, average }
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar notas do aluno';
    }
    next(err);
  }
});

// Get grade matrix for a class grouped by bimester
router.get('/class/:classId', async (req, res, next) => {
  try {
    const students = await Student.find({ class: req.params.classId });
    const matrix = await Promise.all(
      students.map(async (student) => {
        const grades = await Grade.find({ student: student._id });
        const grouped = grades.reduce((acc, grade) => {
          acc[grade.bimester] = (acc[grade.bimester] || 0) + grade.score;
          return acc;
        }, {});
        return [1, 2, 3, 4].map((b) => (grouped[b] !== undefined ? grouped[b] : '-'));
      })
    );
    res.status(200).json({
      success: true,
      message: 'Notas da turma obtidas com sucesso',
      data: matrix
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar notas da turma';
    next(err);
  }
});

// Export grades as PDF for a class
router.get('/class/:id/export', async (req, res, next) => {
  try {
    const classId = req.params.id;
    const classInfo = await Class.findById(classId);
    const students = await Student.find({ class: classId });

    const data = await Promise.all(
      students.map(async (student) => {
        const grades = await Grade.find({ student: student._id });
        const grouped = grades.reduce((acc, grade) => {
          acc[grade.bimester] = (acc[grade.bimester] || 0) + grade.score;
          return acc;
        }, {});
        const bimesters = [1, 2, 3, 4].map((b) => grouped[b]);
        const average =
          bimesters.filter((b) => b !== undefined).reduce((a, b) => a + b, 0) /
          (bimesters.filter((b) => b !== undefined).length || 1);
        return { name: student.name, bimesters, average };
      })
    );

    const className = classInfo
      ? `${classInfo.series}${classInfo.letter} - ${classInfo.discipline}`
      : 'turma';

    const doc = pdfReport(className, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${className.replace(/\s+/g, '_')}_grades.pdf"`
    );

    const stream = doc.pipe(res);
    const handleStreamError = (streamErr) => {
      if (!res.headersSent) {
        streamErr.status = 500;
        streamErr.message = 'Erro ao exportar notas';
        next(streamErr);
      } else if (!res.writableEnded) {
        res.end();
      }
    };

    stream.on('finish', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });

    doc.on('error', handleStreamError);
    stream.on('error', handleStreamError);

    doc.end();
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao exportar notas';
    }
    next(err);
  }
});

// Create or update grade and return bimester total
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }
    const { studentId, evaluationId, score } = req.body;

    if (!studentId || !evaluationId || score === undefined) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    let bimester;
    let grade;

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      const error = new Error('Avaliação não encontrada');
      error.status = 404;
      throw error;
    }

    bimester = evaluation.bimester;
    grade = await Grade.findOne({ student: studentId, evaluation: evaluationId });
    if (grade) {
      grade.score = score;
      grade.bimester = bimester;
    } else {
      grade = new Grade({ student: studentId, evaluation: evaluationId, score, bimester });
    }
    grade.status = 'corrected';
    await grade.save();

    // Link grade to evaluation
    if (!evaluation.grades.find((g) => g.toString() === grade._id.toString())) {
      evaluation.grades.push(grade._id);
      await evaluation.save();
    }

    const grades = await Grade.find({ student: studentId, bimester });
    const bimesterTotal = grades.reduce((sum, g) => sum + g.score, 0);

    res.status(200).json({
      success: true,
      message: 'Nota salva com sucesso',
      data: { grade, bimesterTotal }
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao salvar nota';
    }
    next(err);
  }
});

module.exports = router;
module.exports.tableRouter = tableRouter;
module.exports.classesRouter = classesRouter;

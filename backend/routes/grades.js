const express = require('express');
const mongoose = require('mongoose');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Class = require('../models/Class');
const pdfReport = require('../utils/pdfReport');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const {
  getGradesTable,
  exportGradesTablePdf,
} = require('../controllers/gradesTableController');

const router = express.Router();

router.use(authRequired);

const tableRouter = express.Router();
tableRouter.use(authRequired);
tableRouter.use(ensureTeacher);
tableRouter.get('/classes/:classId/grades/table', getGradesTable);
tableRouter.get('/classes/:classId/grades/export/pdf', exportGradesTablePdf);

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

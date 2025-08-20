const express = require('express');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const CadernoCheck = require('../models/CadernoCheck');
const Student = require('../models/Student');
const Class = require('../models/Class');
const pdfReport = require('../utils/pdfReport');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth());

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
    const { studentId, evaluationId, cadernoCheckId, score } = req.body;

    if (!studentId || (!evaluationId && !cadernoCheckId) || score === undefined) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    let bimester;
    let grade;

    if (evaluationId) {
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
    } else {
      const cadernoCheck = await CadernoCheck.findById(cadernoCheckId);
      if (!cadernoCheck) {
        const error = new Error('Visto não encontrado');
        error.status = 404;
        throw error;
      }
      bimester = cadernoCheck.bimester;
      grade = await Grade.findOne({ student: studentId, cadernoCheck: cadernoCheckId });
      if (grade) {
        grade.score = score;
        grade.bimester = bimester;
      } else {
        grade = new Grade({
          student: studentId,
          cadernoCheck: cadernoCheckId,
          score,
          bimester
        });
      }
      grade.status = 'corrected';
      await grade.save();
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


const express = require('express');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Class = require('../models/Class');
const pdfReport = require('../utils/pdfReport');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get grade matrix for a class grouped by bimester
router.get('/class/:classId', async (req, res) => {
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
    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar notas da turma' });
  }
});

// Export grades as PDF for a class
router.get('/class/:id/export', async (req, res) => {
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
      console.error('PDF stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).end('Erro ao exportar notas');
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
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar notas' });
  }
});

// Create or update grade and return bimester total
router.post('/', async (req, res) => {
  try {
    if (req.profile !== 'teacher') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const { studentId, evaluationId, score } = req.body;

    if (!studentId || !evaluationId || score === undefined) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const bimester = evaluation.bimester;

    let grade = await Grade.findOne({ student: studentId, evaluation: evaluationId });

    if (grade) {
      grade.score = score;
      grade.bimester = bimester;
    } else {
      grade = new Grade({ student: studentId, evaluation: evaluationId, score, bimester });
    }

    await grade.save();

    const grades = await Grade.find({ student: studentId, bimester });
    const bimesterTotal = grades.reduce((sum, g) => sum + g.score, 0);

    res.status(200).json({ grade, bimesterTotal });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao salvar nota' });
  }
});

module.exports = router;


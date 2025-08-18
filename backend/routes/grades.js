const express = require('express');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');

const router = express.Router();

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

// Create or update grade and return bimester total
router.post('/', async (req, res) => {
  try {
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


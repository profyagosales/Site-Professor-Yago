const express = require('express');
const Grade = require('../models/Grade');
const Evaluation = require('../models/Evaluation');

const router = express.Router();

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


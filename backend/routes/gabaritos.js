const express = require('express');
const auth = require('../middleware/auth');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Gabarito = require('../models/Gabarito');
const gabaritoPdf = require('../utils/gabaritoPdf');

const router = express.Router();

router.use(auth);

// Generate gabaritos for students of provided classes
router.post('/', async (req, res) => {
  try {
    if (req.profile !== 'teacher') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { evaluationId, classes, header, instructions } = req.body;
    if (!evaluationId || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const created = [];
    for (const classId of classes) {
      const students = await Student.find({ class: classId }).populate('class');
      for (const student of students) {
        const pdfPath = await gabaritoPdf({
          student,
          header,
          evaluation
        });

        const gabarito = new Gabarito({
          evaluation: evaluation._id,
          student: student._id,
          class: classId,
          header,
          instructions,
          questionCount: evaluation.numQuestions,
          totalValue: evaluation.totalValue,
          answerKey: evaluation.answerKey,
          pdfPath
        });
        await gabarito.save();
        evaluation.gabaritos.push(gabarito._id);
        created.push(gabarito);
      }
    }

    await evaluation.save();
    res.status(201).json({ gabaritos: created });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Erro ao gerar gabaritos' });
  }
});

module.exports = router;

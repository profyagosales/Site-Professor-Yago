const express = require('express');
const Evaluation = require('../models/Evaluation');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Create evaluation
router.post('/', async (req, res) => {
  try {
    if (req.profile !== 'teacher') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const {
      type,
      bimester,
      classes,
      numQuestions,
      questionValue,
      answerKey
    } = req.body;

    if (
      !type ||
      bimester === undefined ||
      !Array.isArray(classes) ||
      numQuestions === undefined ||
      questionValue === undefined
    ) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (answerKey && answerKey.length !== numQuestions) {
      return res
        .status(400)
        .json({ error: 'Gabarito incompatível com o número de questões' });
    }

    const totalValue = numQuestions * questionValue;

    const evaluation = new Evaluation({
      type,
      totalValue,
      bimester,
      classes,
      numQuestions,
      questionValue,
      answerKey,
      applicationDate: new Date()
    });

    await evaluation.save();
    res.status(201).json(evaluation);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar avaliação' });
  }
});

module.exports = router;

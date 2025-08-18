const express = require('express');
const Evaluation = require('../models/Evaluation');

const router = express.Router();

// Create evaluation
router.post('/', async (req, res) => {
  try {
    const { type, totalValue, bimester, classes, numQuestions, questionValue, answerKey } = req.body;

    if (
      !type ||
      totalValue === undefined ||
      bimester === undefined ||
      !Array.isArray(classes) ||
      numQuestions === undefined ||
      questionValue === undefined
    ) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

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

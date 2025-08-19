const express = require('express');
const Evaluation = require('../models/Evaluation');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Create evaluation
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
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
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    if (answerKey && answerKey.length !== numQuestions) {
      const error = new Error('Gabarito incompatível com o número de questões');
      error.status = 400;
      throw error;
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
    res.status(200).json({
      success: true,
      message: 'Avaliação criada com sucesso',
      data: evaluation
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar avaliação';
    }
    next(err);
  }
});

module.exports = router;

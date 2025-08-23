const express = require('express');
const Evaluation = require('../models/Evaluation');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth());

// Create evaluation
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }

    const { name, value, bimester, classes } = req.body;

    if (
      !name ||
      value === undefined ||
      bimester === undefined ||
      !Array.isArray(classes) ||
      classes.length === 0
    ) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
      const error = new Error('Valor deve estar entre 0 e 10');
      error.status = 400;
      throw error;
    }

    const invalidClass = classes.find((c) => !c.classId || !c.date);

    if (invalidClass) {
      const error = new Error('Turma ou data inválida');
      error.status = 400;
      throw error;
    }

    const evaluation = new Evaluation({
      name,
      value: numericValue,
      bimester: Number(bimester),
      classes: classes.map((c) => ({
        classId: c.classId,
        date: new Date(c.date)
      }))
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

const express = require('express');
const auth = require('../middleware/auth');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Gabarito = require('../models/Gabarito');
const gabaritoPdf = require('../utils/gabaritoPdf');

const router = express.Router();

router.use(auth());

// Generate gabaritos for students of provided classes
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }

    const { evaluationId, classes, header, instructions } = req.body;
    if (!evaluationId || !Array.isArray(classes) || classes.length === 0) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      const error = new Error('Avaliação não encontrada');
      error.status = 404;
      throw error;
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
          class: student.class._id,
          pdfPath,
          totalValue: evaluation.totalValue,
          header,
          instructions,
          questionCount: evaluation.numQuestions,
          answerKey: evaluation.answerKey
        });
        await gabarito.save();
        evaluation.gabaritos.push(gabarito._id);
        created.push(gabarito);
      }
    }

    await evaluation.save();
    res.status(200).json({
      success: true,
      message: 'Gabaritos gerados com sucesso',
      data: { gabaritos: created }
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao gerar gabaritos';
    }
    next(err);
  }
});

module.exports = router;

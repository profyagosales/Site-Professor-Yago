const express = require('express');
const CadernoCheck = require('../models/CadernoCheck');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Register a new caderno check
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }
    const { class: classId, description, date, bimester, totalValue } = req.body;

    if (!classId || !date || bimester === undefined || totalValue === undefined) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }

    const classStudents = await Student.find({ class: classId }).select('_id');
    const students = classStudents.map((s) => ({ student: s._id, done: false }));

    const caderno = new CadernoCheck({
      class: classId,
      description,
      date,
      bimester,
      totalValue,
      students
    });

    await caderno.save();
    res.status(200).json({
      success: true,
      message: 'Visto criado com sucesso',
      data: caderno
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar visto';
    }
    next(err);
  }
});

// Update caderno check and recalculate grades
router.put('/:id', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }

    const { students } = req.body;
    if (!Array.isArray(students)) {
      const error = new Error('Lista de alunos inválida');
      error.status = 400;
      throw error;
    }

    const caderno = await CadernoCheck.findById(req.params.id);
    if (!caderno) {
      const error = new Error('Visto não encontrado');
      error.status = 404;
      throw error;
    }

    caderno.students = students;
    await caderno.save();

    const checks = await CadernoCheck.find({
      class: caderno.class,
      bimester: caderno.bimester
    }).sort({ date: 1 });

    const totalVistos = checks.length;
    if (totalVistos > 0) {
      const cadernoCheckId = checks[0]._id;
      const totalValue = checks[0].totalValue;
      const classStudents = await Student.find({ class: caderno.class }).select('_id');

      for (const st of classStudents) {
        const studentId = st._id.toString();
        let vistosFeitos = 0;
        for (const chk of checks) {
          const entry = chk.students.find(
            (s) => s.student.toString() === studentId && s.done
          );
          if (entry) vistosFeitos++;
        }
        const nota = (vistosFeitos / totalVistos) * totalValue;

        let grade = await Grade.findOne({
          student: studentId,
          cadernoCheck: cadernoCheckId
        });
        if (grade) {
          grade.score = nota;
          grade.bimester = caderno.bimester;
        } else {
          grade = new Grade({
            student: studentId,
            cadernoCheck: cadernoCheckId,
            bimester: caderno.bimester,
            score: nota
          });
        }
        await grade.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Visto atualizado com sucesso',
      data: caderno
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao atualizar visto';
    }
    next(err);
  }
});

// Get caderno checks for a class and bimester with progress
router.get('/:classId/:bimester', async (req, res, next) => {
  try {
    const { classId, bimester } = req.params;
    const checks = await CadernoCheck.find({
      class: classId,
      bimester: Number(bimester)
    });

    const result = checks.map((chk) => {
      const alunosFeitos = chk.students.filter((s) => s.done).length;
      const totalAlunos = chk.students.length;
      const percentual = totalAlunos
        ? (alunosFeitos / totalAlunos) * 100
        : 0;
      return {
        ...chk.toObject(),
        alunos_feitos: alunosFeitos,
        total_alunos: totalAlunos,
        percentual
      };
    });

    res.status(200).json({
      success: true,
      message: 'Vistos encontrados com sucesso',
      data: result
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar vistos';
    }
    next(err);
  }
});

module.exports = router;


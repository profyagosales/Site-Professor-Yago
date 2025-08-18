const express = require('express');
const CadernoCheck = require('../models/CadernoCheck');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Register a new caderno check
router.post('/', async (req, res) => {
  try {
    if (req.profile !== 'teacher') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const { class: classId, description, date, bimester, totalValue } = req.body;

    if (!classId || !date || bimester === undefined || totalValue === undefined) {
      return res.status(400).json({ error: 'Dados inválidos' });
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
    res.status(201).json(caderno);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar visto' });
  }
});

// Update caderno check and recalculate grades
router.put('/:id', async (req, res) => {
  try {
    if (req.profile !== 'teacher') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'Lista de alunos inválida' });
    }

    const caderno = await CadernoCheck.findById(req.params.id);
    if (!caderno) {
      return res.status(404).json({ error: 'Visto não encontrado' });
    }

    caderno.students = students;
    await caderno.save();

    const checks = await CadernoCheck.find({
      class: caderno.class,
      bimester: caderno.bimester
    }).sort({ date: 1 });

    const totalVistos = checks.length;
    if (totalVistos > 0) {
      const evaluationId = checks[0]._id;
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
          evaluation: evaluationId
        });
        if (grade) {
          grade.score = nota;
          grade.bimester = caderno.bimester;
        } else {
          grade = new Grade({
            student: studentId,
            evaluation: evaluationId,
            bimester: caderno.bimester,
            score: nota
          });
        }
        await grade.save();
      }
    }

    res.json(caderno);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar visto' });
  }
});

// Get caderno checks for a class and bimester with progress
router.get('/:classId/:bimester', async (req, res) => {
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

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar vistos' });
  }
});

module.exports = router;


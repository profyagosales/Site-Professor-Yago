const express = require('express');
const CadernoCheck = require('../models/CadernoCheck');
const CadernoConfig = require('../models/CadernoConfig');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth());

async function recalculateGrades(classId, term) {
  const checks = await CadernoCheck.find({ class: classId, term }).sort({ date: 1 });
  if (!checks.length) return;
  const config = await CadernoConfig.findOne({ class: classId });
  const total = config?.totals?.get(String(term)) || 0;
  const valuePerCheck = checks.length ? total / checks.length : 0;
  const cadernoCheckId = checks[0]._id;
  const classStudents = await Student.find({ class: classId }).select('_id');

  for (const st of classStudents) {
    const studentId = st._id.toString();
    let feitos = 0;
    for (const chk of checks) {
      if (chk.presentStudentIds.map((id) => id.toString()).includes(studentId)) feitos++;
    }
    const score = feitos * valuePerCheck;
    let grade = await Grade.findOne({ student: studentId, cadernoCheck: cadernoCheckId });
    if (grade) {
      grade.score = score;
      grade.bimester = term;
    } else {
      grade = new Grade({
        student: studentId,
        cadernoCheck: cadernoCheckId,
        bimester: term,
        score
      });
    }
    await grade.save();
  }
}

// Config routes
router.get('/config/:classId', async (req, res, next) => {
  try {
    const { classId } = req.params;
    let config = await CadernoConfig.findOne({ class: classId });
    if (!config) {
      config = new CadernoConfig({ class: classId });
      await config.save();
    }
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar configuração';
    }
    next(err);
  }
});

router.put('/config/:classId', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }
    const { classId } = req.params;
    const { totals } = req.body;
    if (!totals || typeof totals !== 'object') {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }
    let config = await CadernoConfig.findOne({ class: classId });
    if (!config) config = new CadernoConfig({ class: classId });
    Object.entries(totals).forEach(([term, total]) => {
      config.totals.set(term, total);
    });
    await config.save();
    // Recalculate grades for affected terms
    await Promise.all(
      Object.keys(totals).map((t) => recalculateGrades(classId, Number(t)))
    );
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao salvar configuração';
    }
    next(err);
  }
});

// Register a new caderno check
router.post('/', async (req, res, next) => {
  try {
    if (req.profile !== 'teacher') {
      const error = new Error('Acesso negado');
      error.status = 403;
      throw error;
    }
    const { class: classId, title, date, term, presentStudentIds = [] } = req.body;
    if (!classId || !date || term === undefined) {
      const error = new Error('Dados inválidos');
      error.status = 400;
      throw error;
    }
    const caderno = new CadernoCheck({
      class: classId,
      title,
      date,
      term,
      presentStudentIds
    });
    await caderno.save();
    await recalculateGrades(classId, term);
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
    const { presentStudentIds } = req.body;
    if (!Array.isArray(presentStudentIds)) {
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
    caderno.presentStudentIds = presentStudentIds;
    await caderno.save();
    await recalculateGrades(caderno.class, caderno.term);
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

// Get caderno checks for a class and term with progress
router.get('/:classId/:term', async (req, res, next) => {
  try {
    const { classId, term } = req.params;
    const [checks, totalAlunos] = await Promise.all([
      CadernoCheck.find({ class: classId, term: Number(term) }),
      Student.countDocuments({ class: classId })
    ]);
    const result = checks.map((chk) => {
      const alunosFeitos = chk.presentStudentIds.length;
      const percentual = totalAlunos ? (alunosFeitos / totalAlunos) * 100 : 0;
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


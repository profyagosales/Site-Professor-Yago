const { isValidObjectId } = require('mongoose');
const Student = require('../models/Student');
const StudentGrade = require('../models/StudentGrade');

const VALID_STATUSES = StudentGrade.STATUS_VALUES || ['FREQUENTE', 'INFREQUENTE', 'TRANSFERIDO', 'ABANDONO'];

function sanitizeGrade(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    _id: String(doc._id),
    class: String(doc.class),
    student: String(doc.student),
    year: Number(doc.year),
    term: Number(doc.term),
    score: Number(doc.score),
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function ensureStudentInClass(classId, studentId) {
  const exists = await Student.exists({ _id: studentId, class: classId });
  if (!exists) {
    const error = new Error('Aluno não pertence a esta turma.');
    error.status = 404;
    throw error;
  }
}

exports.listStudentGrades = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const grades = await StudentGrade.find({ class: classId, student: studentId })
      .sort({ year: 1, term: 1 })
      .lean();

    const sanitized = grades
      .map((grade) => sanitizeGrade(grade))
      .filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Notas obtidas com sucesso',
      data: sanitized,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar notas do aluno';
    }
    next(err);
  }
};

exports.upsertStudentGrade = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const year = Number(req.body.year);
    const term = Number(req.body.term);
    const score = Number(req.body.score);
    const status = String(req.body.status || '').trim().toUpperCase();

    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      const error = new Error('Ano inválido');
      error.status = 400;
      throw error;
    }

    if (![1, 2, 3, 4].includes(term)) {
      const error = new Error('Bimestre inválido');
      error.status = 400;
      throw error;
    }

    if (Number.isNaN(score) || score < 0 || score > 10) {
      const error = new Error('Nota deve estar entre 0 e 10');
      error.status = 400;
      throw error;
    }

    const effectiveStatus = VALID_STATUSES.includes(status) ? status : 'FREQUENTE';

    await ensureStudentInClass(classId, studentId);

    const result = await StudentGrade.findOneAndUpdate(
      { class: classId, student: studentId, year, term },
      {
        $set: {
          score,
          status: effectiveStatus,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
        rawResult: true,
      }
    );

    const gradeDoc = result && result.value ? result.value : null;
    const created = Boolean(result?.lastErrorObject?.upserted);

    const grade = sanitizeGrade(gradeDoc);
    if (!grade) {
      const error = new Error('Não foi possível salvar a nota.');
      error.status = 500;
      throw error;
    }

    res.status(created ? 201 : 200).json({
      success: true,
      message: 'Nota salva com sucesso',
      data: grade,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao salvar nota do aluno';
    }
    next(err);
  }
};

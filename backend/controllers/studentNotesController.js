const { isValidObjectId } = require('mongoose');
const Student = require('../models/Student');
const StudentNote = require('../models/StudentNote');

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}

function sanitizeNote(doc) {
  if (!doc) return null;
  const note = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(note._id),
    _id: String(note._id),
    classId: String(note.class),
    studentId: String(note.student),
    body: typeof note.body === 'string' ? note.body : '',
    visibleToStudent: Boolean(note.visibleToStudent),
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
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

exports.listStudentNotes = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const notes = await StudentNote.find({ class: classId, student: studentId })
      .sort({ createdAt: -1 })
      .lean();

    const data = notes
      .map((note) => sanitizeNote(note))
      .filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Anotações obtidas com sucesso',
      data,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar anotações do aluno';
    }
    next(err);
  }
};

exports.createStudentNote = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body) {
      const error = new Error('Informe o conteúdo da anotação.');
      error.status = 400;
      throw error;
    }

    const visibleToStudent = toBoolean(req.body.visibleToStudent);

    await ensureStudentInClass(classId, studentId);

    const note = await StudentNote.create({
      class: classId,
      student: studentId,
      body,
      visibleToStudent,
    });

    const data = sanitizeNote(note);

    res.status(201).json({
      success: true,
      message: 'Anotação criada com sucesso',
      data,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao criar anotação do aluno';
    }
    next(err);
  }
};

exports.updateStudentNote = async (req, res, next) => {
  try {
    const { classId, studentId, noteId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId) || !isValidObjectId(noteId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    const updates = {};
    if (req.body.body !== undefined) {
      const nextBody = typeof req.body.body === 'string' ? req.body.body.trim() : '';
      if (!nextBody) {
        const error = new Error('Informe o conteúdo da anotação.');
        error.status = 400;
        throw error;
      }
      updates.body = nextBody;
    }

    if (req.body.visibleToStudent !== undefined) {
      updates.visibleToStudent = toBoolean(req.body.visibleToStudent);
    }

    if (Object.keys(updates).length === 0) {
      const error = new Error('Nenhuma alteração informada.');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const note = await StudentNote.findOneAndUpdate(
      { _id: noteId, class: classId, student: studentId },
      { $set: updates },
      { new: true }
    );

    if (!note) {
      const error = new Error('Anotação não encontrada.');
      error.status = 404;
      throw error;
    }

    const data = sanitizeNote(note);

    res.status(200).json({
      success: true,
      message: 'Anotação atualizada com sucesso',
      data,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao atualizar anotação do aluno';
    }
    next(err);
  }
};

exports.deleteStudentNote = async (req, res, next) => {
  try {
    const { classId, studentId, noteId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(studentId) || !isValidObjectId(noteId)) {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }

    await ensureStudentInClass(classId, studentId);

    const result = await StudentNote.findOneAndDelete({
      _id: noteId,
      class: classId,
      student: studentId,
    });

    if (!result) {
      const error = new Error('Anotação não encontrada.');
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Anotação removida com sucesso',
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover anotação do aluno';
    }
    next(err);
  }
};

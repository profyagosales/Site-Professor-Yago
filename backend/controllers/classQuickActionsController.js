const { isValidObjectId, Types } = require('mongoose');
const Class = require('../models/Class');

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function ensureValidISO(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Data inválida. Use um formato ISO (AAAA-MM-DD ou similar).');
    error.status = 400;
    throw error;
  }
  return parsed.toISOString();
}

function sanitizeActivity(entry) {
  if (!entry) return null;
  const createdAt = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt;
  return {
    id: String(entry._id),
    _id: String(entry._id),
    title: String(entry.title ?? ''),
    dateISO: entry.dateISO || null,
    createdAt: createdAt || new Date().toISOString(),
  };
}

function sanitizeMilestone(entry) {
  if (!entry) return null;
  return {
    id: String(entry._id),
    _id: String(entry._id),
    label: String(entry.label ?? ''),
    dateISO: entry.dateISO || null,
  };
}

function sanitizeNotice(entry) {
  if (!entry) return null;
  const createdAt = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt;
  return {
    id: String(entry._id),
    _id: String(entry._id),
    message: String(entry.message ?? ''),
    createdAt: createdAt || new Date().toISOString(),
  };
}

async function ensureClass(classId) {
  if (!isValidObjectId(classId)) {
    const error = new Error('ID de turma inválido.');
    error.status = 400;
    throw error;
  }
  const exists = await Class.exists({ _id: classId });
  if (!exists) {
    const error = new Error('Turma não encontrada.');
    error.status = 404;
    throw error;
  }
}

exports.addActivity = async (req, res, next) => {
  try {
    const { classId } = req.params;
    await ensureClass(classId);

    const title = toTrimmedString(req.body?.title);
    if (!title) {
      const error = new Error('Informe um título para a atividade.');
      error.status = 400;
      throw error;
    }

    const dateRaw = toTrimmedString(req.body?.dateISO);
    const dateISO = dateRaw ? ensureValidISO(dateRaw) : '';

    const entry = {
      _id: new Types.ObjectId(),
      title,
      dateISO: dateISO || null,
      createdAt: new Date(),
    };

    await Class.updateOne({ _id: classId }, { $push: { activities: entry } });

    res.status(201).json({
      success: true,
      message: 'Atividade adicionada com sucesso.',
      data: sanitizeActivity(entry),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao adicionar atividade da turma.';
    }
    next(err);
  }
};

exports.removeActivity = async (req, res, next) => {
  try {
    const { classId, activityId } = req.params;
    await ensureClass(classId);
    if (!isValidObjectId(activityId)) {
      const error = new Error('ID da atividade inválido.');
      error.status = 400;
      throw error;
    }

    const updated = await Class.findOneAndUpdate(
      { _id: classId, 'activities._id': activityId },
      { $pull: { activities: { _id: activityId } } },
      { new: true, select: '_id' }
    ).lean();

    if (!updated) {
      const error = new Error('Atividade não encontrada nesta turma.');
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Atividade removida com sucesso.',
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover atividade da turma.';
    }
    next(err);
  }
};

exports.addMilestone = async (req, res, next) => {
  try {
    const { classId } = req.params;
    await ensureClass(classId);

    const label = toTrimmedString(req.body?.label);
    if (!label) {
      const error = new Error('Informe o título da data importante.');
      error.status = 400;
      throw error;
    }

    const dateRaw = toTrimmedString(req.body?.dateISO);
    const dateISO = dateRaw ? ensureValidISO(dateRaw) : '';

    const entry = {
      _id: new Types.ObjectId(),
      label,
      dateISO: dateISO || null,
    };

    await Class.updateOne({ _id: classId }, { $push: { milestones: entry } });

    res.status(201).json({
      success: true,
      message: 'Data importante adicionada com sucesso.',
      data: sanitizeMilestone(entry),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao adicionar data importante da turma.';
    }
    next(err);
  }
};

exports.removeMilestone = async (req, res, next) => {
  try {
    const { classId, milestoneId } = req.params;
    await ensureClass(classId);
    if (!isValidObjectId(milestoneId)) {
      const error = new Error('ID da data importante inválido.');
      error.status = 400;
      throw error;
    }

    const updated = await Class.findOneAndUpdate(
      { _id: classId, 'milestones._id': milestoneId },
      { $pull: { milestones: { _id: milestoneId } } },
      { new: true, select: '_id' }
    ).lean();

    if (!updated) {
      const error = new Error('Data importante não encontrada nesta turma.');
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Data importante removida com sucesso.',
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover data importante da turma.';
    }
    next(err);
  }
};

exports.addNotice = async (req, res, next) => {
  try {
    const { classId } = req.params;
    await ensureClass(classId);

    const message = toTrimmedString(req.body?.message);
    if (!message) {
      const error = new Error('Informe o aviso que deseja registrar.');
      error.status = 400;
      throw error;
    }

    const entry = {
      _id: new Types.ObjectId(),
      message,
      createdAt: new Date(),
    };

    await Class.updateOne({ _id: classId }, { $push: { notices: entry } });

    res.status(201).json({
      success: true,
      message: 'Aviso registrado com sucesso.',
      data: sanitizeNotice(entry),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao adicionar aviso da turma.';
    }
    next(err);
  }
};

exports.removeNotice = async (req, res, next) => {
  try {
    const { classId, noticeId } = req.params;
    await ensureClass(classId);
    if (!isValidObjectId(noticeId)) {
      const error = new Error('ID do aviso inválido.');
      error.status = 400;
      throw error;
    }

    const updated = await Class.findOneAndUpdate(
      { _id: classId, 'notices._id': noticeId },
      { $pull: { notices: { _id: noticeId } } },
      { new: true, select: '_id' }
    ).lean();

    if (!updated) {
      const error = new Error('Aviso não encontrado nesta turma.');
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Aviso removido com sucesso.',
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover aviso da turma.';
    }
    next(err);
  }
};

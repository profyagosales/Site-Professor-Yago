const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Content = require('../models/Content');
const Class = require('../models/Class');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const { resolveClassAccess, toId } = require('../services/acl');

const router = express.Router();

function parseLimit(raw, fallback = 50) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function toBoolean(raw, fallback = false) {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'boolean') return raw;
  const token = String(raw).trim().toLowerCase();
  if (!token) return fallback;
  if (['1', 'true', 'yes', 'sim', 'on'].includes(token)) return true;
  if (['0', 'false', 'no', 'nao', 'off'].includes(token)) return false;
  return fallback;
}

function parseBimester(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 4) {
    throw Object.assign(new Error('Bimestre inválido.'), { status: 400 });
  }
  return value;
}

function parseDate(raw, { required = false } = {}) {
  if (raw === undefined || raw === null || raw === '') {
    if (required) {
      throw Object.assign(new Error('Data inválida.'), { status: 400 });
    }
    return undefined;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error('Data inválida.'), { status: 400 });
  }
  return date;
}

function buildClassLabel(doc) {
  if (!doc) return '';
  const parts = [];
  if (doc.name) {
    parts.push(doc.name);
  } else {
    if (doc.series) {
      parts.push(`${doc.series}º${doc.letter ?? ''}`.trim());
    }
    if (doc.discipline) {
      parts.push(doc.discipline);
    }
  }
  return parts.filter(Boolean).join(' • ');
}

function sanitizeContent(doc, classMap = new Map()) {
  if (!doc) return null;
  const classId = toId(doc.classId);
  const classInfo = classId ? classMap.get(classId) : null;
  return {
    id: String(doc._id),
    _id: String(doc._id),
    classId,
    teacherId: toId(doc.teacher),
    bimester: doc.bimester,
    title: doc.title,
    description: doc.description ?? null,
    date: doc.date instanceof Date ? doc.date.toISOString() : doc.date,
    done: Boolean(doc.done),
    className: buildClassLabel(classInfo),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
  };
}

async function loadClassMapFromContents(items) {
  const ids = Array.from(
    new Set(
      items
        .map((item) => toId(item.classId))
        .filter(Boolean),
    ),
  );
  if (!ids.length) return new Map();
  const classes = await Class.find({ _id: { $in: ids } })
    .select('name series letter discipline')
    .lean();
  const map = new Map();
  classes.forEach((doc) => {
    map.set(String(doc._id), doc);
  });
  return map;
}

async function ensureTeacherAccess(req, classId) {
  const access = await resolveClassAccess(classId, req.user);
  if (!access.ok) {
    const error = new Error('Acesso restrito aos professores da turma.');
    error.status = access.reason === 'class-not-found' ? 404 : 403;
    throw error;
  }
  return access.classRef;
}

async function buildFilters(req) {
  const filters = { teacher: req.user._id };
  const { classId } = req.query;

  if (classId) {
    await ensureTeacherAccess(req, classId);
    filters.classId = classId;
  }

  if (req.query.bimester !== undefined) {
    filters.bimester = parseBimester(req.query.bimester);
  }

  if (req.query.done !== undefined) {
    filters.done = toBoolean(req.query.done, undefined);
  }

  const from = req.query.from ? parseDate(req.query.from) : undefined;
  const to = req.query.to ? parseDate(req.query.to) : undefined;
  if (from || to) {
    filters.date = {};
    if (from) filters.date.$gte = from;
    if (to) filters.date.$lte = to;
  }

  return filters;
}

async function listContents(req, res, next) {
  try {
    const filters = await buildFilters(req);
    const limit = parseLimit(req.query.limit, 50);
    const skip = Number.isFinite(Number(req.query.offset)) ? Math.max(Number(req.query.offset), 0) : 0;
    const sort = req.query.sort === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Content.find(filters)
        .sort({ date: sort, createdAt: sort })
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(filters),
    ]);

    const classMap = await loadClassMapFromContents(items);

    res.status(200).json({
      success: true,
      data: items.map((item) => sanitizeContent(item, classMap)),
      meta: {
        total,
        limit,
        offset: skip,
      },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar conteúdos';
    }
    next(err);
  }
}

router.get(
  '/',
  authRequired,
  ensureTeacher,
  [
    query('bimester').optional().isInt({ min: 1, max: 4 }).withMessage('Bimestre inválido.'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limite inválido.'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset inválido.'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error(errors.array()[0]?.msg || 'Parâmetros inválidos');
      error.status = 400;
      return next(error);
    }
    return listContents(req, res, next);
  }
);

async function createContent(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error(errors.array()[0]?.msg || 'Dados inválidos');
      error.status = 400;
      throw error;
    }

    const classId = req.body.classId;
    await ensureTeacherAccess(req, classId);

    const payload = {
      teacher: req.user._id,
      classId,
      bimester: Number(req.body.bimester),
      title: req.body.title.trim(),
      description: req.body.description?.trim() || undefined,
      date: parseDate(req.body.date, { required: true }),
      done: toBoolean(req.body.done, false),
    };

    const content = await Content.create(payload);
    const classMap = await loadClassMapFromContents([content]);

    res.status(201).json({
      success: true,
      message: 'Conteúdo criado com sucesso',
      data: sanitizeContent(content, classMap),
    });
  } catch (err) {
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar conteúdo';
    }
    next(err);
  }
}

router.post(
  '/',
  authRequired,
  ensureTeacher,
  [
    body('classId').notEmpty().withMessage('Turma é obrigatória.'),
    body('bimester').isInt({ min: 1, max: 4 }).withMessage('Bimestre inválido.'),
    body('title').trim().notEmpty().withMessage('Título é obrigatório.'),
    body('date').notEmpty().withMessage('Data é obrigatória.'),
  ],
  createContent
);

router.patch(
  '/:id',
  authRequired,
  ensureTeacher,
  [
    body('bimester').optional().isInt({ min: 1, max: 4 }).withMessage('Bimestre inválido.'),
    body('date').optional().notEmpty().withMessage('Data inválida.'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0]?.msg || 'Dados inválidos');
        error.status = 400;
        throw error;
      }

      const content = await Content.findById(req.params.id);
      if (!content) {
        const error = new Error('Conteúdo não encontrado');
        error.status = 404;
        throw error;
      }

      await ensureTeacherAccess(req, content.classId);

      const updates = { ...req.body };
      if (updates.title) updates.title = String(updates.title).trim();
      if (updates.description !== undefined) {
        updates.description = String(updates.description || '').trim() || undefined;
      }
      if (updates.date !== undefined) {
        updates.date = parseDate(updates.date, { required: true });
      }
      if (updates.done !== undefined) {
        updates.done = toBoolean(updates.done, false);
      }

      if (updates.classId && updates.classId !== String(content.classId)) {
        await ensureTeacherAccess(req, updates.classId);
      }

      const updated = await Content.findByIdAndUpdate(content._id, updates, {
        new: true,
        runValidators: true,
      });

      const classMap = await loadClassMapFromContents([updated]);

      res.status(200).json({
        success: true,
        message: 'Conteúdo atualizado com sucesso',
        data: sanitizeContent(updated, classMap),
      });
    } catch (err) {
      if (!err.status) {
        err.status = 400;
        err.message = 'Erro ao atualizar conteúdo';
      }
      next(err);
    }
  }
);

router.delete('/:id', authRequired, ensureTeacher, async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      const error = new Error('Conteúdo não encontrado');
      error.status = 404;
      throw error;
    }
    await ensureTeacherAccess(req, content.classId);

    await Content.deleteOne({ _id: content._id });

    res.status(200).json({
      success: true,
      message: 'Conteúdo removido com sucesso',
      data: null,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover conteúdo';
    }
    next(err);
  }
});

async function getSummary(req, res, next) {
  try {
    const limit = parseLimit(req.query.limit, 5);
    const filters = await buildFilters(req);
    const items = await Content.find(filters)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const classMap = await loadClassMapFromContents(items);

    res.status(200).json({
      success: true,
      data: items.map((item) => sanitizeContent(item, classMap)),
      meta: { limit },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar conteúdos';
    }
    next(err);
  }
}

router.get('/summary', authRequired, ensureTeacher, getSummary);

module.exports = router;
module.exports.listContents = listContents;
module.exports.getSummary = getSummary;

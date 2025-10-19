const mongoose = require('mongoose');
const { z } = require('zod');
const Content = require('../models/Content');
const Class = require('../models/Class');
const { resolveClassAccess, toId } = require('../services/acl');

const BOOLEAN_TRUE = ['true', '1', 'yes', 'sim', 'on'];
const BOOLEAN_FALSE = ['false', '0', 'no', 'nao', 'off'];

const objectIdSchema = z
  .string({ required_error: 'classId é obrigatório.' })
  .min(1, 'classId é obrigatório.')
  .refine((value) => mongoose.Types.ObjectId.isValid(value), 'classId inválido.');

const bimesterSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z
    .number({ required_error: 'Bimestre inválido.' })
    .int('Bimestre inválido.')
    .min(1, 'Bimestre deve ser entre 1 e 4.')
    .max(4, 'Bimestre deve ser entre 1 e 4.')
);

const booleanSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const token = value.trim().toLowerCase();
    if (BOOLEAN_TRUE.includes(token)) return true;
    if (BOOLEAN_FALSE.includes(token)) return false;
  }
  return value;
}, z.boolean({ invalid_type_error: 'Valor booleano inválido.' }));

const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? value : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const rawIso =
      /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
    const parsed = new Date(rawIso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}, z.date({ invalid_type_error: 'Data inválida.' }));

const createSchema = z.object({
  classId: objectIdSchema,
  title: z
    .string({ required_error: 'Título é obrigatório.' })
    .trim()
    .min(1, 'Título é obrigatório.'),
  description: z
    .union([z.string().trim().min(1).nullable(), z.literal('').transform(() => null)])
    .optional(),
  date: dateSchema,
  bimester: bimesterSchema,
  done: booleanSchema.optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(1, 'Título é obrigatório.').optional(),
    description: z
      .union([z.string().trim().min(1).nullable(), z.literal('').transform(() => null)])
      .optional(),
    date: dateSchema.optional(),
    bimester: bimesterSchema.optional(),
    done: booleanSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Nenhum campo para atualizar.',
  });

function parseLimit(raw, fallback = 50) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function toBoolean(raw, fallback = undefined) {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'boolean') return raw;
  const token = String(raw).trim().toLowerCase();
  if (!token) return fallback;
  if (BOOLEAN_TRUE.includes(token)) return true;
  if (BOOLEAN_FALSE.includes(token)) return false;
  return fallback;
}

function parseQueryDate(raw) {
  if (!raw && raw !== 0) return undefined;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? undefined : raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function buildClassLabel(doc) {
  if (!doc) return '';
  const parts = [];
  if (doc.name) {
    parts.push(doc.name);
  } else {
    const series = doc.series ? `${doc.series}º` : '';
    const letter = doc.letter ?? '';
    const discipline = doc.discipline || doc.subject || '';
    const grade = `${series}${letter}`.trim();
    if (grade) parts.push(`Turma ${grade}`);
    if (discipline) parts.push(discipline);
  }
  return parts.filter(Boolean).join(' • ');
}

function sanitizeContent(doc, classMap = new Map()) {
  if (!doc) return null;
  const plain = doc.toJSON ? doc.toJSON() : doc;
  const classId = toId(plain.classId);
  const classInfo = classId ? classMap.get(classId) : null;
  return {
    id: String(plain._id),
    _id: String(plain._id),
    classId,
    teacherId: toId(plain.teacher),
    bimester: plain.bimester,
    title: plain.title,
    description: plain.description ?? null,
    date:
      plain.date instanceof Date
        ? plain.date.toISOString()
        : typeof plain.date === 'string'
          ? plain.date
          : null,
    done: Boolean(plain.done),
    className: buildClassLabel(classInfo),
    createdAt:
      plain.createdAt instanceof Date ? plain.createdAt.toISOString() : plain.createdAt ?? null,
    updatedAt:
      plain.updatedAt instanceof Date ? plain.updatedAt.toISOString() : plain.updatedAt ?? null,
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
    .select('name series letter discipline subject')
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

function handleZodError(err, next) {
  if (!(err instanceof z.ZodError)) {
    return false;
  }
  const message = err.issues[0]?.message || 'Dados inválidos.';
  const error = new Error(message);
  error.status = 400;
  next(error);
  return true;
}

async function listContents(req, res, next) {
  try {
    const teacherId = req.user?._id || req.user?.id;
    if (!teacherId) {
      const error = new Error('Professor não identificado.');
      error.status = 401;
      throw error;
    }

    const filters = { teacher: teacherId };
    const {
      classId,
      bimester,
      done,
      status,
      from,
      to,
      limit: limitRaw,
      offset,
      page: pageRaw,
      sort,
    } = req.query || {};

    if (classId) {
      await ensureTeacherAccess(req, classId);
      filters.classId = classId;
    }

    if (bimester !== undefined) {
      const parsedBimester = bimesterSchema.parse(bimester);
      filters.bimester = parsedBimester;
    }

    let doneFilter;
    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (['done', 'completed', 'concluido', 'concluida', 'concluída', 'finalizado'].includes(normalizedStatus)) {
        doneFilter = true;
      } else if (['pending', 'open', 'pendente', 'andamento', 'ativo', 'ativos'].includes(normalizedStatus)) {
        doneFilter = false;
      } else if (['all', 'todos', 'todas'].includes(normalizedStatus)) {
        doneFilter = undefined;
      }
    }

    if (doneFilter === undefined && done !== undefined) {
      doneFilter = toBoolean(done, undefined);
    }

    if (doneFilter !== undefined) {
      filters.done = doneFilter;
    }

    const fromDate = parseQueryDate(from);
    const toDate = parseQueryDate(to);
    if (fromDate || toDate) {
      filters.date = {};
      if (fromDate) filters.date.$gte = fromDate;
      if (toDate) filters.date.$lte = toDate;
    }

    const limit = parseLimit(limitRaw, 50);
    const parsedOffset = Math.max(Number(offset) || 0, 0);
    let page = Number.parseInt(pageRaw, 10);
    if (!Number.isFinite(page) || page < 1) {
      page = undefined;
    }
    let skip = parsedOffset;
    if (page !== undefined) {
      skip = (page - 1) * limit;
    } else {
      page = Math.floor(skip / limit) + 1;
    }
    const direction = sort === 'desc' ? -1 : 1;

    const [items, total] = await Promise.all([
      Content.find(filters)
        .sort({ date: direction, createdAt: direction })
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(filters),
    ]);

    const classMap = await loadClassMapFromContents(items);
    const sanitizedItems = items.map((item) => sanitizeContent(item, classMap));
    const hasMore = skip + sanitizedItems.length < total;

    res.status(200).json({
      success: true,
      data: {
        items: sanitizedItems,
        total,
        limit,
        page,
        offset: skip,
        hasMore,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return handleZodError(err, next);
    }
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar conteúdos';
    }
    next(err);
  }
}

async function createContent(req, res, next) {
  try {
    const teacherId = req.user?._id || req.user?.id;
    if (!teacherId) {
      const error = new Error('Professor não identificado.');
      error.status = 401;
      throw error;
    }

    const payload = createSchema.parse(req.body || {});

    await ensureTeacherAccess(req, payload.classId);

    const doc = await Content.create({
      teacher: teacherId,
      classId: payload.classId,
      bimester: payload.bimester,
      title: payload.title,
      description: payload.description ?? undefined,
      date: payload.date,
      done: payload.done ?? false,
    });

    const classMap = await loadClassMapFromContents([doc]);
    const sanitized = sanitizeContent(doc, classMap);

    res.status(201).json({
      success: true,
      data: sanitized,
    });
  } catch (err) {
    if (handleZodError(err, next)) return;
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao criar conteúdo';
    }
    next(err);
  }
}

async function updateContent(req, res, next) {
  try {
    const teacherId = req.user?._id || req.user?.id;
    if (!teacherId) {
      const error = new Error('Professor não identificado.');
      error.status = 401;
      throw error;
    }

    const content = await Content.findById(req.params.id);
    if (!content) {
      const error = new Error('Conteúdo não encontrado.');
      error.status = 404;
      throw error;
    }

    await ensureTeacherAccess(req, content.classId);

    const payload = updateSchema.parse(req.body || {});

    if (payload.title !== undefined) content.title = payload.title;
    if (payload.description !== undefined) content.description = payload.description ?? undefined;
    if (payload.date !== undefined) content.date = payload.date;
    if (payload.bimester !== undefined) content.bimester = payload.bimester;
    if (payload.done !== undefined) content.done = payload.done;

    await content.save();

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    if (handleZodError(err, next)) return;
    if (!err.status) {
      err.status = 400;
      err.message = 'Erro ao atualizar conteúdo';
    }
    next(err);
  }
}

async function deleteContent(req, res, next) {
  try {
    const teacherId = req.user?._id || req.user?.id;
    if (!teacherId) {
      const error = new Error('Professor não identificado.');
      error.status = 401;
      throw error;
    }

    const content = await Content.findById(req.params.id);
    if (!content) {
      const error = new Error('Conteúdo não encontrado.');
      error.status = 404;
      throw error;
    }

    const isOwner = toId(content.teacher) === String(teacherId);
    if (!isOwner) {
      await ensureTeacherAccess(req, content.classId);
    }

    await Content.deleteOne({ _id: content._id });

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao remover conteúdo';
    }
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const teacherId = req.user?._id || req.user?.id;
    if (!teacherId) {
      const error = new Error('Professor não identificado.');
      error.status = 401;
      throw error;
    }

    const filters = { teacher: teacherId };
    const { classId, bimester } = req.query || {};

    if (classId) {
      await ensureTeacherAccess(req, classId);
      filters.classId = classId;
    }

    if (bimester !== undefined) {
      filters.bimester = bimesterSchema.parse(bimester);
    }

    const limit = parseLimit(req.query?.limit, 5);

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
    if (handleZodError(err, next)) return;
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao buscar conteúdos';
    }
    next(err);
  }
}

module.exports = {
  listContents,
  createContent,
  updateContent,
  deleteContent,
  getSummary,
};

const express = require('express');
const mongoose = require('mongoose');
const ensureTeacher = require('../middleware/ensureTeacher');
const AgendaItem = require('../models/AgendaItem');
const Class = require('../models/Class');

const router = express.Router();

router.use(ensureTeacher);

const VALID_TYPES = ['ATIVIDADE', 'CONTEUDO', 'DATA'];
const YEAR = 2025;
const YEAR_START = new Date(Date.UTC(YEAR, 0, 1));
const YEAR_END = new Date(Date.UTC(YEAR, 11, 31, 23, 59, 59, 999));

function toISODate(date) {
  return new Date(date).toISOString();
}

function toDateOnly(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function parseDateInput(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function clampToYearRange(date) {
  if (date.getTime() < YEAR_START.getTime()) return new Date(YEAR_START);
  if (date.getTime() > YEAR_END.getTime()) return new Date(YEAR_END);
  return date;
}

function ensureDateWithinYear(date) {
  return date.getUTCFullYear() === YEAR;
}

function normalizeType(value, fallback = null) {
  if (!value) return fallback;
  const raw = value.toString().trim().toUpperCase();
  if (VALID_TYPES.includes(raw)) {
    return raw;
  }
  return fallback;
}

function formatClassLabel(cls) {
  if (!cls) return null;
  const grade = [cls.series, cls.letter].filter(Boolean).join('');
  const discipline = cls.discipline || cls.subject;
  const name = cls.name || cls.nome;
  if (name) return String(name);
  const gradeLabel = grade ? `Turma ${grade}` : '';
  return [gradeLabel, discipline].filter(Boolean).join(' - ') || null;
}

function serializeAgendaItem(item, classMap) {
  const classId = item.classId ? String(item.classId) : null;
  const cls = classId ? classMap.get(classId) : null;
  return {
    id: String(item._id),
    titulo: item.title,
    descricao: item.description ?? null,
    data: toISODate(item.date),
    dataIso: toDateOnly(item.date),
    turmaId: classId,
    turmaNome: formatClassLabel(cls),
    tipo: item.type,
  };
}

async function buildClassMap(classIds) {
  if (!classIds.length) return new Map();
  const classes = await Class.find({ _id: { $in: classIds } })
    .select('_id series letter discipline subject name nome')
    .lean();
  const map = new Map();
  classes.forEach((cls) => {
    map.set(String(cls._id), cls);
  });
  return map;
}

router.get('/', async (req, res, next) => {
  try {
    const teacherId = req.user?.id || req.user?._id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const fromParam = parseDateInput(req.query.from);
    const toParam = parseDateInput(req.query.to);
    let from = fromParam ? clampToYearRange(fromParam) : new Date(YEAR_START);
    let to = toParam
      ? clampToYearRange(new Date(toParam.getTime() + 24 * 60 * 60 * 1000 - 1))
      : new Date(YEAR_END);

    if (from.getTime() > to.getTime()) {
      [from, to] = [to, from];
    }

    const typeFilter = normalizeType(req.query.tipo, 'ALL');
    const criteria = {
      teacherId,
      date: {
        $gte: from < YEAR_START ? YEAR_START : from,
        $lte: to > YEAR_END ? YEAR_END : to,
      },
    };

    if (typeFilter && typeFilter !== 'ALL') {
      criteria.type = typeFilter;
    }

    const items = await AgendaItem.find(criteria).sort({ date: 1, title: 1 }).lean();
    const classIds = items
      .map((item) => (item.classId ? String(item.classId) : null))
      .filter(Boolean);
    const classMap = await buildClassMap(classIds);

    const payload = items.map((item) => serializeAgendaItem(item, classMap));
    return res.json({ success: true, data: payload });
  } catch (err) {
    return next(err);
  }
});

function extractPayload(body) {
  const title = typeof body.titulo === 'string' ? body.titulo : body.title;
  const description = typeof body.descricao === 'string' ? body.descricao : body.description;
  const dateStr = typeof body.data === 'string' ? body.data : body.date;
  const classId = typeof body.turmaId === 'string' ? body.turmaId : body.classId;
  const type = normalizeType(body.tipo ?? body.type);
  return { title, description, dateStr, classId, type };
}

router.post('/', async (req, res, next) => {
  try {
    const teacherId = req.user?.id || req.user?._id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, description, dateStr, classId, type } = extractPayload(req.body || {});

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Informe um título válido.' });
    }

    const parsedDate = parseDateInput(dateStr);
    if (!parsedDate || !ensureDateWithinYear(parsedDate)) {
      return res.status(400).json({ success: false, message: 'Informe uma data válida em 2025.' });
    }

    if (!type) {
      return res.status(400).json({ success: false, message: 'Informe um tipo válido.' });
    }

    let normalizedClassId = null;
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ success: false, message: 'Turma inválida.' });
      }
      normalizedClassId = classId;
    }

    const item = await AgendaItem.create({
      teacherId,
      title: title.trim(),
      description: description ? description.trim() : null,
      date: parsedDate,
      classId: normalizedClassId,
      type,
    });

    const classMap = await buildClassMap(normalizedClassId ? [normalizedClassId] : []);
    return res.status(201).json({ success: true, data: serializeAgendaItem(item, classMap) });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const teacherId = req.user?.id || req.user?._id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador inválido.' });
    }

    const current = await AgendaItem.findOne({ _id: id, teacherId });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Item não encontrado.' });
    }

    const { title, description, dateStr, classId, type } = extractPayload(req.body || {});

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Informe um título válido.' });
      }
      current.title = title.trim();
    }

    if (description !== undefined) {
      current.description = description ? description.trim() : null;
    }

    if (dateStr !== undefined) {
      const parsedDate = parseDateInput(dateStr);
      if (!parsedDate || !ensureDateWithinYear(parsedDate)) {
        return res.status(400).json({ success: false, message: 'Informe uma data válida em 2025.' });
      }
      current.date = parsedDate;
    }

    if (classId !== undefined) {
      if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ success: false, message: 'Turma inválida.' });
      }
      current.classId = classId || null;
    }

    if (type !== undefined) {
      if (!type) {
        return res.status(400).json({ success: false, message: 'Informe um tipo válido.' });
      }
      current.type = type;
    }

    await current.save();
    const classIds = current.classId ? [current.classId] : [];
    const classMap = await buildClassMap(classIds.map((value) => String(value)));
    return res.json({ success: true, data: serializeAgendaItem(current, classMap) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const teacherId = req.user?.id || req.user?._id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador inválido.' });
    }

    const result = await AgendaItem.findOneAndDelete({ _id: id, teacherId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Item não encontrado.' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

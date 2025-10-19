const mongoose = require('mongoose');
const GradeScheme = require('../models/GradeScheme');

const MAX_TOTAL_POINTS = 10;

function toObjectId(value, fieldName = 'id') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    const error = new Error(`${fieldName} é obrigatório.`);
    error.status = 400;
    throw error;
  }
  const raw = typeof value === 'string' ? value.trim() : value;
  if (mongoose.Types.ObjectId.isValid(raw)) {
    return new mongoose.Types.ObjectId(raw);
  }
  const error = new Error(`${fieldName} inválido.`);
  error.status = 400;
  throw error;
}

function ensureYear(value) {
  const year = Number.parseInt(value, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    const error = new Error('Ano inválido.');
    error.status = 400;
    throw error;
  }
  return year;
}

function ensureBimester(value) {
  const bimester = Number(value);
  if (!Number.isInteger(bimester) || bimester < 1 || bimester > 4) {
    const error = new Error('Bimestre inválido. Use valores entre 1 e 4.');
    error.status = 400;
    throw error;
  }
  return bimester;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item, index) => {
      const entry = item || {};
      const label = typeof entry.label === 'string' ? entry.label.trim() : '';
      const rawPoints =
        typeof entry.points === 'number'
          ? entry.points
          : entry.points !== undefined
            ? Number.parseFloat(String(entry.points).replace(',', '.'))
            : 0;
      const points = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : 0;
      const color =
        typeof entry.color === 'string' && entry.color.trim() ? entry.color.trim() : null;
      const rawOrder =
        typeof entry.order === 'number'
          ? entry.order
          : Number.isFinite(Number(entry.order))
            ? Number(entry.order)
            : index;

      return {
        label,
        points,
        color,
        order: rawOrder,
      };
    })
    .filter((entry) => entry.label || entry.points > 0)
    .sort((a, b) => a.order - b.order)
    .map((entry, index) => ({
      ...entry,
      order: Number.isFinite(entry.order) ? entry.order : index,
    }));
}

function calculateTotalPoints(items) {
  return items.reduce((sum, item) => {
    const value = Number(item.points);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function assertTotalPoints(items) {
  const total = calculateTotalPoints(items);
  const rounded = Number(total.toFixed(2));
  if (rounded > MAX_TOTAL_POINTS + Number.EPSILON) {
    const error = new Error(`Total de pontos deve ser no máximo ${MAX_TOTAL_POINTS}.`);
    error.status = 400;
    throw error;
  }
  return rounded;
}

function sanitizeScheme(doc) {
  if (!doc) return null;
  const json = doc.toJSON ? doc.toJSON() : doc;
  const items = Array.isArray(json.items) ? [...json.items] : [];
  const orderedItems = items
    .map((item, index) => ({
      label: typeof item.label === 'string' ? item.label : '',
      points: Number.isFinite(item.points) ? Number(item.points) : 0,
      color:
        typeof item.color === 'string' && item.color.trim() ? item.color.trim() : null,
      order:
        typeof item.order === 'number'
          ? item.order
          : Number.isFinite(Number(item.order))
            ? Number(item.order)
            : index,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    id: String(json._id),
    classId: json.classId ? String(json.classId) : null,
    year: json.year,
    bimester: json.bimester,
    items: orderedItems,
    totalPoints: Number.isFinite(json.totalPoints) ? Number(json.totalPoints) : 0,
    showToStudents: Boolean(json.showToStudents),
    createdAt:
      json.createdAt instanceof Date ? json.createdAt.toISOString() : json.createdAt || null,
    updatedAt:
      json.updatedAt instanceof Date ? json.updatedAt.toISOString() : json.updatedAt || null,
  };
}

async function listSchemes(req, res, next) {
  try {
    const classId = toObjectId(req.query.classId, 'classId');
    const year = ensureYear(req.query.year ?? new Date().getFullYear());

    const schemes = await GradeScheme.find({ classId, year }).sort({ bimester: 1 }).lean();
    const data = schemes.map((scheme) => sanitizeScheme(scheme));

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function getScheme(req, res, next) {
  try {
    const schemeId = toObjectId(req.params.id, 'id');
    const scheme = await GradeScheme.findById(schemeId);
    if (!scheme) {
      const error = new Error('Esquema de notas não encontrado.');
      error.status = 404;
      throw error;
    }
    res.json({
      success: true,
      data: sanitizeScheme(scheme),
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function upsertScheme(req, res, next) {
  try {
    const classId = toObjectId(req.body?.classId, 'classId');
    const year = ensureYear(req.body?.year ?? new Date().getFullYear());
    const bimester = ensureBimester(req.body?.bimester);
    const items = normalizeItems(req.body?.items ?? []);
    const totalPoints = assertTotalPoints(items);

    let scheme = await GradeScheme.findOne({ classId, year, bimester });
    if (!scheme) {
      scheme = new GradeScheme({ classId, year, bimester });
    }

    scheme.items = items;
    scheme.totalPoints = totalPoints;

    if (typeof req.body?.showToStudents === 'boolean') {
      scheme.showToStudents = req.body.showToStudents;
    }

    await scheme.save();

    res.json({
      success: true,
      data: sanitizeScheme(scheme),
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

async function setVisibleScheme(req, res, next) {
  try {
    const classId = toObjectId(req.body?.classId, 'classId');
    const year = ensureYear(req.body?.year ?? new Date().getFullYear());
    const bimester = ensureBimester(req.body?.bimester);

    const target = await GradeScheme.findOne({ classId, year, bimester });
    if (!target) {
      const error = new Error('Esquema de notas não encontrado para o bimestre informado.');
      error.status = 404;
      throw error;
    }

    await GradeScheme.updateMany({ classId, year }, { $set: { showToStudents: false } });
    target.showToStudents = true;
    await target.save();

    res.json({
      success: true,
      data: sanitizeScheme(target),
    });
  } catch (err) {
    if (!err.status) err.status = 400;
    next(err);
  }
}

module.exports = {
  listSchemes,
  getScheme,
  upsertScheme,
  setVisibleScheme,
};

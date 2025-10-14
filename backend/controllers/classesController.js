const { isValidObjectId } = require('mongoose');
const Class = require('../models/Class');

const allowedWeekdays = [1, 2, 3, 4, 5];
const allowedSlots = [1, 2, 3];
const dayNameToNumber = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
};

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function deriveSeriesLetter(name) {
  const normalized = normalizeString(name);
  if (!normalized) return {};
  const numberMatch = normalized.match(/^\d{1,2}/);
  if (!numberMatch) {
    return {};
  }
  const seriesValue = Number(numberMatch[0]);
  const suffix = normalizeString(normalized.slice(numberMatch[0].length));
  const letterValue = suffix ? suffix[0].toUpperCase() : undefined;
  return {
    series: Number.isNaN(seriesValue) ? undefined : seriesValue,
    letter: letterValue,
  };
}

function normalizeSchedule(input, { required = false } = {}) {
  if (input === undefined) {
    return required ? [] : undefined;
  }

  if (!Array.isArray(input)) {
    const error = new Error('Informe os horários da turma no formato de lista.');
    error.status = 400;
    throw error;
  }

  const grouped = new Map();

  input.forEach((entry) => {
    if (!entry) return;
    const slotRaw = entry.slot ?? entry.turno ?? entry.timeSlot;
    const slot = parseNumber(slotRaw);
    if (!slot || !allowedSlots.includes(slot)) return;

    const ensureBucket = () => {
      if (!grouped.has(slot)) {
        grouped.set(slot, new Set());
      }
      return grouped.get(slot);
    };

    const bucket = ensureBucket();

    if (Array.isArray(entry.days)) {
      entry.days.forEach((dayValue) => {
        const parsedDay = parseNumber(dayValue);
        if (parsedDay && allowedWeekdays.includes(parsedDay)) {
          bucket.add(parsedDay);
        }
      });
      return;
    }

    const weekdaysSource = entry.weekdays ?? entry.weekDays;
    if (Array.isArray(weekdaysSource)) {
      weekdaysSource.forEach((value) => {
        const parsedDay = parseNumber(value);
        if (parsedDay && allowedWeekdays.includes(parsedDay)) {
          bucket.add(parsedDay);
        }
      });
      return;
    }

    const weekdayRaw = entry.weekday ?? entry.day ?? entry.weekDay;
    let weekday = parseNumber(weekdayRaw);
    if (!weekday && typeof weekdayRaw === 'string') {
      weekday = dayNameToNumber[weekdayRaw.trim().toUpperCase()];
    }
    if (weekday && allowedWeekdays.includes(weekday)) {
      bucket.add(weekday);
    }
  });

  const normalized = Array.from(grouped.entries())
    .map(([slot, daysSet]) => {
      const days = Array.from(daysSet).sort((a, b) => a - b);
      return { slot: Number(slot), days };
    })
    .filter((entry) => entry.days.length > 0)
    .sort((a, b) => a.slot - b.slot);

  return normalized;
}

function normalizeTeacherIdsList(input) {
  if (!Array.isArray(input)) return undefined;
  const unique = [];
  const seen = new Set();
  input.forEach((teacherId) => {
    if (!teacherId) return;
    const id = String(teacherId).trim();
    if (!id || !isValidObjectId(id)) return;
    if (seen.has(id)) return;
    seen.add(id);
    unique.push(id);
  });
  return unique;
}

function buildSummaryPayload(doc) {
  if (!doc) return null;
  const id = String(doc._id || doc.id);
  const series = doc.series ?? undefined;
  const letter = doc.letter ?? undefined;
  const subject = doc.subject || doc.discipline || '';
  const name = doc.name || (series !== undefined && letter ? `${series}${letter}` : '');
  const teachers = Array.isArray(doc.teachers) ? doc.teachers : [];
  return {
    _id: id,
    id,
    name,
    subject,
    year: doc.year ?? undefined,
    series,
    letter,
    discipline: subject,
    schedule: Array.isArray(doc.schedule) ? doc.schedule : [],
    studentsCount: typeof doc.studentsCount === 'number' ? doc.studentsCount : 0,
    teachersCount: typeof doc.teachersCount === 'number' ? doc.teachersCount : teachers.length,
  };
}

async function ensureClassExists(id) {
  if (!isValidObjectId(id)) {
    const error = new Error('ID inválido');
    error.status = 400;
    throw error;
  }
  const cls = await Class.findById(id).lean();
  if (!cls) {
    const error = new Error('Turma não encontrada');
    error.status = 404;
    throw error;
  }
  return cls;
}

exports.createClass = async (req, res, next) => {
  try {
    const name = normalizeString(req.body?.name ?? req.body?.nome);
    const subject = normalizeString(req.body?.subject ?? req.body?.discipline);
    const year = parseNumber(req.body?.year ?? req.body?.ano);

    if (!name) {
      const error = new Error('Informe o nome da turma.');
      error.status = 400;
      throw error;
    }
    if (!subject) {
      const error = new Error('Informe a disciplina da turma.');
      error.status = 400;
      throw error;
    }

    const derived = deriveSeriesLetter(name);
    const series = parseNumber(req.body?.series ?? req.body?.serie) ?? derived.series;
    const letter = normalizeString(req.body?.letter ?? req.body?.turma ?? derived.letter);

    if (!series || !letter) {
      const error = new Error('Não foi possível determinar a série e a turma.');
      error.status = 400;
      throw error;
    }

    const schedulePayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'schedule')
      ? normalizeSchedule(req.body.schedule, { required: true })
      : [];
    const teachers = normalizeTeacherIdsList(req.body?.teachers);
    const responsibleTeacherIdRaw = req.body?.responsibleTeacherId;
    const responsibleTeacherId = responsibleTeacherIdRaw && isValidObjectId(String(responsibleTeacherIdRaw))
      ? String(responsibleTeacherIdRaw)
      : null;
    const ownerId = req.user && req.user._id ? String(req.user._id) : null;

    const payload = {
      name,
      subject,
      year,
      series,
      letter,
      discipline: subject,
      schedule: schedulePayload,
      studentsCount: 0,
    };

    let teacherList = teachers ? [...teachers] : [];

    if (ownerId) {
      teacherList.push(ownerId);
    }
    if (responsibleTeacherId) {
      teacherList.push(responsibleTeacherId);
      payload.responsibleTeacherId = responsibleTeacherId;
    }

    const normalizedTeacherList = normalizeTeacherIdsList(teacherList) ?? [];
    if (normalizedTeacherList.length > 0) {
      payload.teachers = normalizedTeacherList;
      payload.teacherIds = normalizedTeacherList;
    }

    const created = await Class.create(payload);
    const summary = buildSummaryPayload(created);

    res.status(201).json({
      success: true,
      message: 'Turma criada com sucesso',
      data: summary,
    });
  } catch (error) {
    if (!error.status) {
      error.status = 400;
      error.message = error.message || 'Erro ao criar turma';
    }
    next(error);
  }
};

exports.updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ensureClassExists(id);

    const updates = {};
    const name = normalizeString(req.body?.name ?? req.body?.nome);
    const subject = normalizeString(req.body?.subject ?? req.body?.discipline);
    const year = parseNumber(req.body?.year ?? req.body?.ano);
  const schedulePayload = normalizeSchedule(req.body?.schedule);

    if (name) {
      updates.name = name;
      const derived = deriveSeriesLetter(name);
      if (derived.series) updates.series = derived.series;
      if (derived.letter) updates.letter = derived.letter;
    }

    if (subject) {
      updates.subject = subject;
      updates.discipline = subject;
    }

    if (year !== undefined) {
      updates.year = year;
      if (!updates.series) {
        const derived = deriveSeriesLetter(name || req.body?.name);
        if (derived.series) updates.series = derived.series;
      }
    }

    if (req.body?.series !== undefined) {
      const series = parseNumber(req.body.series);
      if (series !== undefined) {
        updates.series = series;
      }
    }

    if (req.body?.letter !== undefined) {
      const letterValue = normalizeString(req.body.letter);
      if (letterValue) {
        updates.letter = letterValue;
      }
    }

    if (req.body?.teachers !== undefined) {
      const teachersList = normalizeTeacherIdsList(req.body.teachers);
      if (teachersList) {
        updates.teachers = teachersList;
        updates.teacherIds = teachersList;
      } else {
        updates.teachers = [];
        updates.teacherIds = [];
      }
    }

    if (req.body?.responsibleTeacherId !== undefined) {
      const value = req.body.responsibleTeacherId;
      if (value === null || value === '') {
        updates.responsibleTeacherId = null;
      } else if (isValidObjectId(String(value))) {
        const id = String(value);
        updates.responsibleTeacherId = id;
        if (Array.isArray(updates.teacherIds)) {
          const list = new Set(updates.teacherIds);
          list.add(id);
          updates.teacherIds = Array.from(list);
          updates.teachers = Array.from(list);
        }
      }
    }

    if (schedulePayload !== undefined) {
      updates.schedule = schedulePayload;
    }

    if (Object.keys(updates).length === 0) {
      const error = new Error('Nenhuma alteração informada.');
      error.status = 400;
      throw error;
    }

    const updated = await Class.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();

    const summary = buildSummaryPayload(updated);
    res.status(200).json({
      success: true,
      message: 'Turma atualizada com sucesso',
      data: summary,
    });
  } catch (error) {
    if (!error.status) {
      error.status = 400;
      error.message = error.message || 'Erro ao atualizar turma';
    }
    next(error);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ensureClassExists(id);

    const schedule = normalizeSchedule(req.body?.schedule, { required: true });
    const updated = await Class.findByIdAndUpdate(
      id,
      { schedule },
      { new: true, runValidators: true }
    ).lean();

    const summary = buildSummaryPayload(updated);
    res.status(200).json({
      success: true,
      message: 'Horários da turma atualizados com sucesso',
      data: summary,
    });
  } catch (error) {
    if (!error.status) {
      error.status = 400;
      error.message = error.message || 'Erro ao atualizar horários da turma';
    }
    next(error);
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ensureClassExists(id);
    await Class.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Turma removida com sucesso', data: null });
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = error.message || 'Erro ao remover turma';
    }
    next(error);
  }
};

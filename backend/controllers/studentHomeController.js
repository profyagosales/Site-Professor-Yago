const mongoose = require('mongoose');
const Class = require('../models/Class');
const Announcement = require('../models/Announcement');
const Content = require('../models/Content');
const GradePlan = require('../models/GradePlan');
const Score = require('../models/Score');
const Student = require('../models/Student');

const DAY_MS = 24 * 60 * 60 * 1000;

function toObjectId(value) {
  if (!value) return null;
  try {
    if (value instanceof mongoose.Types.ObjectId) return value;
    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    if (typeof value === 'object' && value._id && mongoose.Types.ObjectId.isValid(value._id)) {
      return new mongoose.Types.ObjectId(value._id);
    }
  } catch {
    return null;
  }
  return null;
}

function currentYear(reference = new Date()) {
  return reference.getFullYear();
}

function parseYear(candidate, fallback = currentYear()) {
  if (candidate === undefined || candidate === null || candidate === '') return fallback;
  const parsed = Number.parseInt(candidate, 10);
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 3000) {
    return parsed;
  }
  return fallback;
}

function currentTerm(reference = new Date()) {
  const month = reference.getMonth(); // 0-11
  return Math.min(4, Math.max(1, Math.floor(month / 3) + 1));
}

function toDateISO(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return input.toISOString().slice(0, 10);
  }
  return null;
}

function deriveClassName(cls) {
  if (!cls) return null;
  if (typeof cls.name === 'string' && cls.name.trim()) {
    return cls.name.trim();
  }
  const series = Number.isFinite(cls.series) ? `${cls.series}º` : '';
  const letter = typeof cls.letter === 'string' && cls.letter.trim() ? cls.letter.trim().toUpperCase() : '';
  const discipline = typeof cls.discipline === 'string' && cls.discipline.trim()
    ? cls.discipline.trim()
    : typeof cls.subject === 'string' && cls.subject.trim()
      ? cls.subject.trim()
      : '';
  const parts = [];
  if (series || letter) {
    const base = `${series}${letter}`.trim();
    if (base) parts.push(`Turma ${base}`);
  }
  if (discipline) {
    parts.push(discipline);
  }
  return parts.join(' • ') || null;
}

function normalizeScheduleEntries(schedule = [], subjectLabel = null) {
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((entry) => {
      const slot = Number(entry?.slot);
      const days = Array.isArray(entry?.days) ? entry.days.filter((day) => [1, 2, 3, 4, 5].includes(Number(day))) : [];
      if (!slot || !days.length) return null;
      return {
        slot,
        days,
        subject: subjectLabel,
      };
    })
    .filter(Boolean);
}

function normalizeAnnouncement(doc) {
  if (!doc) return null;
  const createdAt =
    doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || new Date().toISOString();
  const audience =
    doc.targetType === 'email'
      ? 'PROFESSORES'
      : doc.includeTeachers
        ? 'AMBOS'
        : 'ALUNOS';
  const attachments = Array.isArray(doc.attachments)
    ? doc.attachments
        .map((attachment) => {
          if (!attachment?.url) return null;
          const bytes = typeof attachment.size === 'number' ? attachment.size : null;
          const sizeKb = bytes !== null ? Number((bytes / 1024).toFixed(1)) : null;
          return {
            url: attachment.url,
            mime: attachment.mime || null,
            sizeKb,
            name: attachment.name || null,
          };
        })
        .filter(Boolean)
    : [];
  return {
    id: String(doc._id),
    title: doc.subject || null,
    html: doc.html || null,
    message: doc.message || null,
    attachments,
    createdAt,
    audience,
  };
}

function normalizeAgendaEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    dateISO: entry.dateISO,
    tags: entry.tags && entry.tags.length ? entry.tags : undefined,
  };
}

function buildAgenda(classDoc, contents) {
  const items = [];
  const discipline = typeof classDoc?.discipline === 'string' && classDoc.discipline.trim()
    ? classDoc.discipline.trim()
    : typeof classDoc?.subject === 'string' && classDoc.subject.trim()
      ? classDoc.subject.trim()
      : null;

  if (Array.isArray(contents)) {
    contents.forEach((content) => {
      const dateISO = toDateISO(content.date);
      if (!dateISO) return;
      items.push({
        id: String(content._id),
        kind: 'ATIVIDADE',
        title: content.title || 'Atividade',
        dateISO,
        tags: [
          'Conteúdo',
          content.bimester ? `Bimestre ${content.bimester}` : null,
          discipline,
        ].filter(Boolean),
      });
    });
  }

  if (Array.isArray(classDoc?.activities)) {
    classDoc.activities.forEach((activity) => {
      const dateISO = toDateISO(activity?.dateISO ?? activity?.createdAt);
      if (!dateISO) return;
      items.push({
        id: String(activity._id),
        kind: 'ATIVIDADE',
        title: activity.title || 'Atividade da turma',
        dateISO,
        tags: ['Turma'],
      });
    });
  }

  if (Array.isArray(classDoc?.milestones)) {
    classDoc.milestones.forEach((milestone) => {
      const dateISO = toDateISO(milestone?.dateISO);
      if (!dateISO) return;
      items.push({
        id: String(milestone._id),
        kind: 'DATA',
        title: milestone.label || 'Data importante',
        dateISO,
        tags: ['Marco'],
      });
    });
  }

  items.sort((a, b) => {
    if (a.dateISO === b.dateISO) {
      return a.title.localeCompare(b.title);
    }
    return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
  });

  return items.map(normalizeAgendaEntry).filter(Boolean);
}

function computeStatusForContent(content, now) {
  if (content.done) return 'CONCLUIDA';
  const date = content.date instanceof Date ? content.date : new Date(content.date);
  if (Number.isNaN(date.getTime())) return 'PENDENTE';
  if (date.getTime() < now.getTime()) return 'ATRASADA';
  return 'PENDENTE';
}

function buildUpcomingActivities(contents, now) {
  return contents.map((content) => {
    const dateISO = toDateISO(content.date);
    if (!dateISO) return null;
    return {
      id: String(content._id),
      title: content.title || 'Atividade',
      dateISO,
      term: content.bimester ?? null,
      tag: 'ATIVIDADE',
      status: computeStatusForContent(content, now),
    };
  }).filter(Boolean);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function buildGradeStats(scores) {
  const byTerm = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  const byActivity = {
    1: new Map(),
    2: new Map(),
    3: new Map(),
    4: new Map(),
  };

  scores.forEach((score) => {
    const term = Number(score.term);
    if (!byTerm[term]) return;
    const value = Number(score.score ?? 0);
    if (!Number.isFinite(value)) return;
    byTerm[term].push(value);
    const activityId = String(score.activityId);
    const bucket = byActivity[term];
    const existing = bucket.get(activityId) || [];
    existing.push(value);
    bucket.set(activityId, existing);
  });

  const termStats = {};
  Object.entries(byTerm).forEach(([termKey, list]) => {
    if (!list.length) {
      termStats[termKey] = { avg: 0, median: 0, n: 0 };
      return;
    }
    const sum = list.reduce((acc, value) => acc + value, 0);
    const avg = Number((sum / list.length).toFixed(2));
    const med = Number(median(list).toFixed(2));
    termStats[termKey] = { avg, median: med, n: list.length };
  });

  const activityStats = {};
  Object.entries(byActivity).forEach(([termKey, map]) => {
    const items = [];
    map.forEach((list, activityId) => {
      if (!list.length) return;
      const avg = Number(
        (list.reduce((acc, value) => acc + value, 0) / list.length).toFixed(2)
      );
      items.push({ activityId, avg });
    });
    activityStats[termKey] = items;
  });

  return {
    byTerm: termStats,
    byActivity: activityStats,
  };
}

function sanitizePlanForTerm(plan, term) {
  if (!plan) return null;
  const termKey = String(term);
  const activities = Array.isArray(plan?.terms?.[termKey]) ? plan.terms[termKey] : [];
  return {
    year: plan.year,
    term,
    activities: activities.map((activity) => ({
      id: String(activity._id),
      name: activity.name,
      points: Number(activity.points ?? 0),
    })),
  };
}

function emptyHomePayload() {
  return {
    class: null,
    announcements: [],
    agenda: [],
    atividades: [],
    gradePlan: null,
    gradeStats: {
      byTerm: {
        1: { avg: 0, median: 0, n: 0 },
        2: { avg: 0, median: 0, n: 0 },
        3: { avg: 0, median: 0, n: 0 },
        4: { avg: 0, median: 0, n: 0 },
      },
      byActivity: {},
    },
  };
}

exports.getStudentHome = async (req, res, next) => {
  try {
    const now = new Date();
    const requestedYear = parseYear(req.query?.year, currentYear(now));
    const requestedTerm = req.query?.term ? Number(req.query.term) : currentTerm(now);

    const authClassId = toObjectId(req.auth?.classId);
    const queryClassId = toObjectId(req.query?.classId);
    const authStudentId = toObjectId(req.auth?.sub || req.auth?.userId || req.user?._id || req.user?.id);

    let classId = authClassId || queryClassId || null;
    let studentDoc = null;

    if (authStudentId) {
      studentDoc = await Student.findById(authStudentId).select('class').lean();
    if (studentDoc?.class) {
      const studentClassId = toObjectId(studentDoc.class);
      if (studentClassId) {
        if (!classId) {
          classId = studentClassId;
        } else if (!classId.equals(studentClassId)) {
          classId = studentClassId;
        }
      }
    }
    }

    if (!classId) {
      return res.json({ success: true, data: emptyHomePayload() });
    }

    const visibilityNow = now;
    const contentsWindowStart = new Date(now.getTime() - 15 * DAY_MS);
    const contentsWindowEnd = new Date(now.getTime() + 45 * DAY_MS);
    const upcomingLimit = new Date(now.getTime() + 30 * DAY_MS);

    const [classDoc, contents, announcements, plan, scores] = await Promise.all([
      Class.findById(classId)
        .select('name subject year series letter discipline color schedule activities milestones')
        .lean(),
      Content.find({
        classId,
        date: { $gte: contentsWindowStart, $lte: contentsWindowEnd },
      })
        .sort({ date: 1 })
        .lean(),
      Announcement.find({
        $and: [
          {
            $or: [
              { classIds: { $exists: false } },
              { classIds: { $size: 0 } },
              { classIds: classId },
            ],
          },
          {
            $or: [
              { scheduledFor: { $lte: visibilityNow } },
              { scheduleAt: { $lte: visibilityNow } },
              { scheduledFor: { $exists: false } },
            ],
          },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      GradePlan.findOne({ classId, year: requestedYear }).lean(),
      Score.find({ classId, year: requestedYear }).lean(),
    ]);

    if (!classDoc) {
      return res.json({ success: true, data: emptyHomePayload() });
    }

    const agenda = buildAgenda(classDoc, contents);
    const upcomingContents = contents.filter((content) => {
      const date = content.date instanceof Date ? content.date : new Date(content.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.getTime() >= now.getTime() && date.getTime() <= upcomingLimit.getTime();
    });

    const data = {
      class: {
        id: String(classDoc._id),
        name: deriveClassName(classDoc),
        color: classDoc.color || null,
        year: classDoc.year ?? null,
        schedule: normalizeScheduleEntries(classDoc.schedule, classDoc.discipline || classDoc.subject || null),
      },
      announcements: announcements.map(normalizeAnnouncement).filter(Boolean),
      agenda,
      atividades: buildUpcomingActivities(upcomingContents, now),
      gradePlan: sanitizePlanForTerm(plan, Number.isInteger(requestedTerm) ? requestedTerm : currentTerm(now)),
      gradeStats: buildGradeStats(scores),
    };

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentHome: exports.getStudentHome,
};

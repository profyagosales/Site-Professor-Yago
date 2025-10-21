const express = require('express');
const authRequired = require('../middleware/auth');
const ensureTeacher = require('../middleware/ensureTeacher');
const Content = require('../models/Content');
const Evaluation = require('../models/Evaluation');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

const router = express.Router();
router.use(authRequired);

function isSameTeacher(req) {
  const { teacherId } = req.params || {};
  const userId = req.user?.id || req.user?._id;
  if (!teacherId) return false;
  const role = (req.user?.role || req.user?.profile || '').toString().toLowerCase();
  if (role === 'admin') {
    return true;
  }
  if (!userId) {
    return false;
  }
  return String(userId) === String(teacherId);
}

router.get('/search', ensureTeacher, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 20) : 10;

    const filter = {};
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }

    const teachers = await Teacher.find(filter)
      .select('name email phone photoUrl subjects')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    const data = teachers.map((teacher) => ({
      id: String(teacher._id),
      _id: String(teacher._id),
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || undefined,
      photoUrl: teacher.photoUrl || undefined,
      subjects: Array.isArray(teacher.subjects)
        ? teacher.subjects.filter((item) => typeof item === 'string' && item.trim())
        : [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:teacherId/grade-split/settings', ensureTeacher, async (req, res, next) => {
  try {
    if (!isSameTeacher(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const teacher = await Teacher.findById(req.params.teacherId)
      .select('gradeSplitSettings')
      .lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado.' });
    }
    const rawValue = teacher?.gradeSplitSettings?.defaultTerm;
    const numeric = Number(rawValue);
    const isValid = Number.isInteger(numeric) && numeric >= 1 && numeric <= 4;
    const defaultTerm = isValid ? numeric : null;
    return res.json({
      success: true,
      data: {
        defaultTerm,
        defaultBimester: defaultTerm,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:teacherId/grade-split/settings', ensureTeacher, async (req, res, next) => {
  try {
    if (!isSameTeacher(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const rawValue =
      req.body?.defaultTerm ??
      req.body?.defaultBimester ??
      req.body?.bimestrePadrao ??
      req.body?.bimester ??
      req.body?.bimestre ??
      null;
    const numeric = Number(rawValue);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 4) {
      return res.status(400).json({ success: false, message: 'Bimestre padrão inválido. Use valores entre 1 e 4.' });
    }
    const updated = await Teacher.findByIdAndUpdate(
      req.params.teacherId,
      {
        $set: {
          'gradeSplitSettings.defaultTerm': numeric,
          'gradeSplitSettings.updatedAt': new Date(),
        },
      },
      { new: true, select: '_id' },
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado.' });
    }
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function parseWindow(query) {
  let daysAhead = parseInt(query.daysAhead, 10);
  if (isNaN(daysAhead) || daysAhead <= 0) daysAhead = 30;
  daysAhead = Math.min(daysAhead, 180);
  let limit = parseInt(query.limit, 10); if (isNaN(limit) || limit <= 0) limit = 10; limit = Math.min(limit, 50);
  let skip = parseInt(query.skip, 10); if (isNaN(skip) || skip < 0) skip = 0;
  return { daysAhead, limit, skip };
}

// Upcoming contents for teacher
router.get('/:teacherId/contents/upcoming', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.teacherId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (req.profile !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { daysAhead, limit, skip } = parseWindow(req.query);
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    // classes where teacher is listed
    const classes = await Class.find({
      $or: [{ teachers: req.user.id }, { teacherIds: req.user.id }],
    })
      .select('_id series letter discipline')
      .lean();
    const classIds = classes.map(c => c._id);
    if (!classIds.length) return res.json([]);
    const contents = await Content.find({ classId: { $in: classIds }, date: { $gte: now, $lte: end } })
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const classMap = new Map(classes.map(c => [String(c._id), c]));
    const data = contents.map(c => {
      const cls = classMap.get(String(c.classId));
      const className = cls ? `${cls.series || ''}${cls.letter || ''}${cls.discipline ? ' - ' + cls.discipline : ''}` : '';
      return {
        id: c._id,
        title: c.title,
        date: c.date,
        classId: c.classId,
        className,
        subject: cls?.discipline || null,
      };
    });
    res.json(data);
  } catch (err) { next(err); }
});

// Upcoming evaluations for teacher
router.get('/:teacherId/evaluations/upcoming', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.teacherId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (req.profile !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { daysAhead, limit, skip } = parseWindow(req.query);
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const classes = await Class.find({
      $or: [{ teachers: req.user.id }, { teacherIds: req.user.id }],
    })
      .select('_id series letter discipline')
      .lean();
    const classIds = classes.map(c => c._id);
    if (!classIds.length) return res.json([]);
    // Evaluation embeds class date per class
    const evals = await Evaluation.find({ 'classes.classId': { $in: classIds } }).lean();
    const classMap = new Map(classes.map(c => [String(c._id), c]));
    // Flatten upcoming dates per evaluation/class pair
    const rows = [];
    for (const ev of evals) {
      if (!Array.isArray(ev.classes)) continue;
      for (const c of ev.classes) {
        if (!classMap.has(String(c.classId))) continue;
        if (c.date >= now && c.date <= end) {
          const cls = classMap.get(String(c.classId));
          const className = cls ? `${cls.series || ''}${cls.letter || ''}${cls.discipline ? ' - ' + cls.discipline : ''}` : '';
          rows.push({
            id: ev._id,
            title: ev.name,
            date: c.date,
            classId: c.classId,
            className,
            weight: ev.value,
          });
        }
      }
    }
    rows.sort((a,b)=> a.date - b.date);
    const sliced = rows.slice(skip, skip + limit);
    res.json(sliced);
  } catch (err) { next(err); }
});

module.exports = router;

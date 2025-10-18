const express = require('express');
const authRequired = require('../middleware/auth');
const ensureStudent = require('../middleware/ensureStudent');
const Content = require('../models/Content');
const Evaluation = require('../models/Evaluation');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { publicStudent } = require('../controllers/authController');

function normalizeClassLabel(cls) {
  if (!cls) return null;
  const serie = cls.series ? `${cls.series}º` : '';
  const letter = cls.letter ? `${cls.letter}` : '';
  const discipline = cls.discipline || cls.subject || '';
  const base = [serie, letter].join('').trim();
  const namePart = cls.name || (base ? `Turma ${base}` : null);
  const labelParts = [namePart, discipline].filter(Boolean);
  return labelParts.join(' • ') || discipline || namePart || null;
}

function buildClassSummary(classDoc) {
  if (!classDoc) return null;
  return {
    id: String(classDoc._id),
    nome: normalizeClassLabel(classDoc),
    ano: classDoc.year ?? null,
    serie: classDoc.series ?? null,
    letra: classDoc.letter ?? null,
    disciplina: classDoc.discipline ?? classDoc.subject ?? null,
  };
}

const router = express.Router();
router.use(authRequired);

router.get('/me', ensureStudent, async (req, res, next) => {
  try {
    const requesterId = req.auth?.userId || req.user?.id || req.user?._id;
    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'unauthorized' });
    }

    const student = await Student.findById(requesterId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'student not found' });
    }

    let classDoc = null;
    if (student.class) {
      const classKey = student.class?._id ?? student.class;
      classDoc = await Class.findById(classKey)
        .select('name year series letter discipline subject notices schedule students')
        .lean();
    }

    if (!classDoc) {
      classDoc = await Class.findOne({ students: student._id })
        .select('name year series letter discipline subject notices schedule students')
        .lean();
      if (classDoc?._id && !student.class) {
        student.class = classDoc._id;
        await student.save().catch(() => {});
      }
    }

    const classId = classDoc?._id ? String(classDoc._id) : null;
    const turmaAtual = buildClassSummary(classDoc);

    const userPayload = publicStudent(student, {
      classId,
      turmaAtual,
    });

    return res.json({
      success: true,
      role: 'student',
      isTeacher: false,
      user: userPayload,
      classId,
    });
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

async function getStudentClassIds(studentId) {
  const student = await Student.findById(studentId).select('class').lean();
  if (!student) return [];
  return student.class ? [student.class] : [];
}

router.get('/:studentId/contents/upcoming', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.studentId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { daysAhead, limit, skip } = parseWindow(req.query);
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const classIds = await getStudentClassIds(req.params.studentId);
    if (!classIds.length) return res.json([]);
    const classes = await Class.find({ _id: { $in: classIds } }).select('_id series letter discipline').lean();
    const contents = await Content.find({ classId: { $in: classIds }, date: { $gte: now, $lte: end } })
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const classMap = new Map(classes.map(c => [String(c._id), c]));
    const data = contents.map(c => {
      const cls = classMap.get(String(c.classId));
      const className = cls ? `${cls.series || ''}${cls.letter || ''}${cls.discipline ? ' - ' + cls.discipline : ''}` : '';
      return { id: c._id, title: c.title, date: c.date, classId: c.classId, className, subject: cls?.discipline || null };
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:studentId/evaluations/upcoming', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.studentId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { daysAhead, limit, skip } = parseWindow(req.query);
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const classIds = await getStudentClassIds(req.params.studentId);
    if (!classIds.length) return res.json([]);
    const classes = await Class.find({ _id: { $in: classIds } }).select('_id series letter discipline').lean();
    const classMap = new Map(classes.map(c => [String(c._id), c]));
    const evals = await Evaluation.find({ 'classes.classId': { $in: classIds } }).lean();
    const rows = [];
    for (const ev of evals) {
      if (!Array.isArray(ev.classes)) continue;
      for (const c of ev.classes) {
        if (!classMap.has(String(c.classId))) continue;
        if (c.date >= now && c.date <= end) {
          const cls = classMap.get(String(c.classId));
            const className = cls ? `${cls.series || ''}${cls.letter || ''}${cls.discipline ? ' - ' + cls.discipline : ''}` : '';
            rows.push({ id: ev._id, title: ev.name, date: c.date, classId: c.classId, className, weight: ev.value });
        }
      }
    }
    rows.sort((a,b)=> a.date - b.date);
    const sliced = rows.slice(skip, skip + limit);
    res.json(sliced);
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const authRequired = require('../middleware/auth');
const Content = require('../models/Content');
const Evaluation = require('../models/Evaluation');
const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const Student = require('../models/Student');

const router = express.Router();
router.use(authRequired);

function parseQuery(q) {
  // start: ISO date (YYYY-MM-DD)
  let startStr = q.start;
  let startDate;
  if (startStr) {
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(startStr);
    if (!m) throw Object.assign(new Error('Parâmetro start inválido (use YYYY-MM-DD)'), { status: 400 });
    startDate = new Date(startStr + 'T00:00:00.000Z');
    if (isNaN(startDate.getTime())) throw Object.assign(new Error('Parâmetro start inválido'), { status: 400 });
  } else {
    // Segunda-feira UTC da semana atual
    const now = new Date();
    const day = now.getUTCDay(); // 0=Domingo
    const diff = day === 0 ? 6 : day - 1; // quantos dias desde segunda
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - diff);
    startDate = monday;
  }
  let days = parseInt(q.days, 10); if (isNaN(days) || days <= 0) days = 7; days = Math.min(days, 14);
  let limit = parseInt(q.limit, 10); if (isNaN(limit) || limit <= 0) limit = 100; limit = Math.min(limit, 200);
  let skip = parseInt(q.skip, 10); if (isNaN(skip) || skip < 0) skip = 0;
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  return { startDate, endDate, days, limit, skip };
}

async function buildClassMap(classIds) {
  if (!classIds.length) return new Map();
  const classes = await Class.find({ _id: { $in: classIds } }).select('_id series letter discipline').lean();
  const map = new Map();
  for (const c of classes) map.set(String(c._id), c);
  return map;
}

function classDisplay(c) {
  if (!c) return '';
  const base = `${c.series || ''}${c.letter || ''}`;
  return c.discipline ? `${base} - ${c.discipline}` : base;
}

// Teacher weekly agenda
router.get('/teachers/:teacherId/agenda/week', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.teacherId) || req.profile !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { startDate, endDate, limit, skip } = parseQuery(req.query);
    // Classes do professor
    const classes = await Class.find({ teachers: req.user.id }).select('_id').lean();
    const classIds = classes.map(c => c._id);
    if (!classIds.length) return res.json([]);
    const classMap = await buildClassMap(classIds);
    // Contents
    const contents = await Content.find({ classId: { $in: classIds }, date: { $gte: startDate, $lt: endDate } })
      .select('_id title date classId')
      .lean();
    // Evaluations expandidas
    const evals = await Evaluation.find({ 'classes.classId': { $in: classIds } }).select('_id name value classes').lean();
    const evalRows = [];
    for (const ev of evals) {
      if (!Array.isArray(ev.classes)) continue;
      for (const c of ev.classes) {
        if (!classMap.has(String(c.classId))) continue;
        if (c.date >= startDate && c.date < endDate) {
          evalRows.push({
            type: 'evaluation',
            id: ev._id,
            title: ev.name,
            date: c.date,
            classId: c.classId,
            className: classDisplay(classMap.get(String(c.classId))),
            subject: classMap.get(String(c.classId))?.discipline || null,
            weight: ev.value,
            source: 'evaluations',
          });
        }
      }
    }
    // Announcements (já publicados): scheduledFor <= now e se classIds vazio ou intersecta
    const now = new Date();
    const anns = await Announcement.find({
      teacher: req.user.id,
      scheduledFor: { $lte: now },
      $or: [ { classIds: { $size: 0 } }, { classIds: { $in: classIds } } ],
    }).select('_id message scheduledFor classIds').lean();
    const annRows = [];
    for (const a of anns) {
      const targets = (Array.isArray(a.classIds) && a.classIds.length ? a.classIds : [null]);
      for (const cid of targets) {
        if (cid && !classMap.has(String(cid))) continue;
        // Mostrar na semana somente se cai dentro do intervalo
        const d = a.scheduledFor || now;
        if (d >= startDate && d < endDate) {
          annRows.push({
            type: 'announcement',
            id: a._id,
            title: 'Aviso',
            date: d,
            classId: cid,
            className: cid ? classDisplay(classMap.get(String(cid))) : '',
            subject: cid ? classMap.get(String(cid))?.discipline || null : null,
            message: a.message,
            source: 'announcements',
          });
        }
      }
    }
    const contentRows = contents.map(c => ({
      type: 'content',
      id: c._id,
      title: c.title,
      date: c.date,
      classId: c.classId,
      className: classDisplay(classMap.get(String(c.classId))),
      subject: classMap.get(String(c.classId))?.discipline || null,
      source: 'contents',
    }));
    const all = [...contentRows, ...evalRows, ...annRows];
    all.sort((a,b)=> a.date - b.date);
    const sliced = all.slice(skip, skip + limit);
    res.json(sliced);
  } catch (err) { next(err); }
});

// Student weekly agenda
router.get('/students/:studentId/agenda/week', async (req, res, next) => {
  try {
    if (!req.user || String(req.user.id) !== String(req.params.studentId) || req.profile !== 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { startDate, endDate, limit, skip } = parseQuery(req.query);
    const student = await Student.findById(req.params.studentId).select('class').lean();
    if (!student || !student.class) return res.json([]);
    const classIds = [student.class];
    const classMap = await buildClassMap(classIds);
    const contents = await Content.find({ classId: { $in: classIds }, date: { $gte: startDate, $lt: endDate } })
      .select('_id title date classId')
      .lean();
    const evals = await Evaluation.find({ 'classes.classId': { $in: classIds } }).select('_id name value classes').lean();
    const evalRows = [];
    for (const ev of evals) {
      if (!Array.isArray(ev.classes)) continue;
      for (const c of ev.classes) {
        if (String(c.classId) !== String(classIds[0])) continue;
        if (c.date >= startDate && c.date < endDate) {
          evalRows.push({
            type: 'evaluation', id: ev._id, title: ev.name, date: c.date, classId: c.classId,
            className: classDisplay(classMap.get(String(c.classId))), subject: classMap.get(String(c.classId))?.discipline || null,
            weight: ev.value, source: 'evaluations'
          });
        }
      }
    }
    const now = new Date();
    const anns = await Announcement.find({
      scheduledFor: { $lte: now },
      $or: [ { classIds: { $size: 0 } }, { classIds: { $in: classIds } } ],
    }).select('_id message scheduledFor classIds teacher').lean();
    const annRows = [];
    for (const a of anns) {
      const targets = (Array.isArray(a.classIds) && a.classIds.length ? a.classIds : [null]);
      for (const cid of targets) {
        if (cid && !classMap.has(String(cid))) continue;
        const d = a.scheduledFor || now;
        if (d >= startDate && d < endDate) {
          annRows.push({
            type: 'announcement', id: a._id, title: 'Aviso', date: d, classId: cid,
            className: cid ? classDisplay(classMap.get(String(cid))) : '', subject: cid ? classMap.get(String(cid))?.discipline || null : null,
            message: a.message, source: 'announcements'
          });
        }
      }
    }
    const contentRows = contents.map(c => ({
      type: 'content', id: c._id, title: c.title, date: c.date, classId: c.classId,
      className: classDisplay(classMap.get(String(c.classId))), subject: classMap.get(String(c.classId))?.discipline || null,
      source: 'contents'
    }));
    const all = [...contentRows, ...evalRows, ...annRows];
    all.sort((a,b)=> a.date - b.date);
    const sliced = all.slice(skip, skip + limit);
    res.json(sliced);
  } catch (err) { next(err); }
});

module.exports = router;

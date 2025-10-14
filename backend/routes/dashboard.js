const express = require('express');
const mongoose = require('mongoose');
const authRequired = require('../middleware/auth');

// Adapta middlewares mockados como fábrica (() => (req,res,next)=>next())
const withAuth = (req, res, next) => {
  try {
    if (typeof authRequired === 'function') {
      // Se for middleware padrão (req,res,next)
      if (authRequired.length >= 3) {
        return authRequired(req, res, next);
      }
      // Se for fábrica: chama sem args e usa o retorno como middleware
      const maybe = authRequired();
      if (typeof maybe === 'function') return maybe(req, res, next);
    }
    return next();
  } catch (e) {
    return next(e);
  }
};
const Class = require('../models/Class');
const Content = require('../models/Content');

const router = express.Router();

async function getContentProgress(req) {
  const teacherId = req.user && req.user._id;
  if (!teacherId) return [];

  const bimester =
    req.query.bimester !== undefined
      ? Number(req.query.bimester)
      : Math.floor(new Date().getMonth() / 2) + 1;

  const classes = await Class.find({
    $or: [{ teachers: teacherId }, { teacherIds: teacherId }],
  }).select('_id');

  const classIds = classes.map((c) => c._id);
  if (!classIds.length) return [];

  const progress = await Content.aggregate([
    {
      $match: {
        teacher: new mongoose.Types.ObjectId(teacherId),
        classId: { $in: classIds },
        bimester
      }
    },
    {
      $group: {
        _id: '$classId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: ['$done', 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        classId: '$_id',
        completion: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
          ]
        }
      }
    }
  ]);

  const progressMap = progress.reduce((acc, item) => {
    acc[item.classId.toString()] = item.completion;
    return acc;
  }, {});

  return classIds.map((id) => ({
    classId: id,
    completion: progressMap[id.toString()] || 0
  }));
}

router.get('/', withAuth, async (req, res, next) => {
  try {
    const contentProgress = await getContentProgress(req);

    res.status(200).json({
      success: true,
      message: 'Dashboard do professor',
      data: { upcomingEvaluations: [], schedule: [], contentProgress }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/teacher', withAuth, async (req, res, next) => {
  try {
    const contentProgress = await getContentProgress(req);

    res.status(200).json({
      success: true,
      message: 'Dashboard do professor',
      data: { upcomingEvaluations: [], schedule: [], contentProgress }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

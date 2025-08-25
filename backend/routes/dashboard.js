const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
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

  const classes = await Class.find({ teachers: teacherId }).select('_id');

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

router.get('/', auth, async (req, res, next) => {
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

router.get('/teacher', auth, async (req, res, next) => {
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

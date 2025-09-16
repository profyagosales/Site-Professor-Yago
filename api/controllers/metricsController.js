const Essay = require('../models/Essay');
const User = require('../models/User');
const Theme = require('../models/Theme');
const ClassModel = require('../models/Class');
const AICorrectionSuggestion = require('../models/AICorrectionSuggestion');

// GET /metrics/summary (apenas professor)
exports.getSummary = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Apenas professores' });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7*24*60*60*1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000);

    const [studentsCount, classesCount, themesCount, statusAgg, aiCounts, aiLast7d, aiAppliedCounts, aiAppliedLast7d] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      ClassModel.countDocuments({}),
      Theme.countDocuments({ active: true }),
      Essay.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      AICorrectionSuggestion.countDocuments({}),
      AICorrectionSuggestion.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AICorrectionSuggestion.countDocuments({ $or: [ { appliedFeedback: true }, { appliedScores: true } ] }),
      AICorrectionSuggestion.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, $or: [ { appliedFeedback: true }, { appliedScores: true } ] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const byStatus = ['PENDING','GRADING','GRADED','SENT'].reduce((acc,s)=> { acc[s] = 0; return acc; }, {});
    statusAgg.forEach(r => { byStatus[r._id] = r.count });

    // Created last 7 days
    const created7d = await Essay.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Graded last 7 days (usa gradedAt se existir, senão updatedAt quando status GRADED)
    const graded7d = await Essay.aggregate([
      { $match: { status: { $in: ['GRADED','SENT'] }, $or: [ { gradedAt: { $exists: true, $gte: sevenDaysAgo } }, { $and: [ { gradedAt: { $exists: false } }, { updatedAt: { $gte: sevenDaysAgo } } ] } ] } },
      { $project: { effectiveGradedAt: { $ifNull: ['$gradedAt', '$updatedAt'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$effectiveGradedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Correction time (últimos 30 dias) - diferença gradedAt|updatedAt - createdAt
    const correctionSamples = await Essay.aggregate([
      { $match: { status: { $in: ['GRADED','SENT'] }, createdAt: { $gte: thirtyDaysAgo } } },
      { $project: { createdAt: 1, gradedRef: { $ifNull: ['$gradedAt', '$updatedAt'] } } },
      { $project: { diffMs: { $subtract: ['$gradedRef', '$createdAt'] } } }
    ]);
    const diffs = correctionSamples.map(s => s.diffMs).filter(d => d >= 0);
    let avgCorrectionTimeHours = null, medianCorrectionTimeHours = null;
    if (diffs.length) {
      const hours = diffs.map(ms => ms / 1000 / 60 / 60);
      avgCorrectionTimeHours = Number((hours.reduce((a,b)=>a+b,0)/hours.length).toFixed(2));
      const sorted = [...hours].sort((a,b)=>a-b);
      const mid = Math.floor(sorted.length/2);
      medianCorrectionTimeHours = sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
      medianCorrectionTimeHours = Number(medianCorrectionTimeHours.toFixed(2));
    }

    // Aging pendentes
    const pendingAgingSamples = await Essay.aggregate([
      { $match: { status: 'PENDING' } },
      { $project: { ageMs: { $subtract: [now, '$createdAt'] } } }
    ]);
    let pendingAgingHours = null;
    if (pendingAgingSamples.length) {
      const avgMs = pendingAgingSamples.reduce((a,b)=> a + b.ageMs, 0) / pendingAgingSamples.length;
      pendingAgingHours = Number((avgMs/1000/60/60).toFixed(2));
    }

    const created7dTotal = created7d.reduce((a,b)=> a + b.count, 0);
    const graded7dTotal = graded7d.reduce((a,b)=> a + b.count, 0);

    const response = {
      generatedAt: now.toISOString(),
      totals: { students: studentsCount, classes: classesCount, themes: themesCount },
      essays: {
        byStatus,
        total: Object.values(byStatus).reduce((a,b)=> a + b, 0),
        last7d: {
          created: created7d.map(i => ({ day: i._id, count: i.count })),
          graded: graded7d.map(i => ({ day: i._id, count: i.count }))
        }
      },
      ai: {
        suggestionsTotal: aiCounts,
        suggestions7d: aiLast7d.map(i => ({ day: i._id, count: i.count })),
        appliedTotal: aiAppliedCounts,
        applied7d: aiAppliedLast7d.map(i => ({ day: i._id, count: i.count })),
        adoptionRate: aiCounts ? Number((aiAppliedCounts / aiCounts).toFixed(2)) : null
      },
      performance: {
        avgCorrectionTimeHours,
        medianCorrectionTimeHours
      },
      queue: {
        pendingAgingHours,
        gradingInProgress: byStatus.GRADING
      },
      ratios: {
        correctionRate7d: created7dTotal ? Number((graded7dTotal / created7dTotal).toFixed(2)) : null,
        pendingToGraded: (byStatus.GRADED + byStatus.SENT) ? Number((byStatus.PENDING / (byStatus.GRADED + byStatus.SENT)).toFixed(2)) : byStatus.PENDING
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

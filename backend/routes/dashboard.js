const express = require('express');
const Evaluation = require('../models/Evaluation');
const Class = require('../models/Class');

const router = express.Router();

// Teacher dashboard route
router.get('/dashboard/teacher', async (req, res, next) => {
  try {
    const now = new Date();
    const upcomingEvaluations = await Evaluation.find({
      applicationDate: { $gte: now }
    })
      .sort({ applicationDate: 1 })
      .populate('classes');

    const classes = await Class.find().populate('teachers').lean();

    // Group class schedules by day and time if schedule data exists
    const classSchedules = {};
    classes.forEach(cls => {
      if (Array.isArray(cls.schedule)) {
        cls.schedule.forEach(s => {
          const key = `${s.day}-${s.time}`;
          if (!classSchedules[key]) classSchedules[key] = [];
          classSchedules[key].push({
            classId: cls._id,
            series: cls.series,
            letter: cls.letter,
            discipline: cls.discipline,
            teacher: cls.teachers
          });
        });
      }
    });

    // Content progress placeholder per class and term
    const contentProgress = classes.map(cls => ({
      classId: cls._id,
      series: cls.series,
      letter: cls.letter,
      discipline: cls.discipline,
      progress: cls.progress || {}
    }));

    res.status(200).json({
      success: true,
      message: 'Dados do dashboard carregados com sucesso',
      data: { upcomingEvaluations, classSchedules, contentProgress }
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao carregar dados do dashboard';
    next(err);
  }
});

module.exports = router;

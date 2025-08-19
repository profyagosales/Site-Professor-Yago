const express = require('express');
const Notification = require('../models/Notification');
const { scheduleNotification } = require('../services/notificationScheduler');

const router = express.Router();

function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

router.post('/schedule', async (req, res, next) => {
  try {
    const { message, runAt, targets } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      const error = new Error('"message" is required');
      error.status = 400;
      throw error;
    }
    if (!isValidDate(runAt)) {
      const error = new Error('Invalid "runAt" value');
      error.status = 400;
      throw error;
    }
    if (!Array.isArray(targets) || !targets.every(t => typeof t === 'string')) {
      const error = new Error('"targets" must be an array of strings');
      error.status = 400;
      throw error;
    }

    const runDate = new Date(runAt);
    const notification = new Notification({
      message,
      runAt: runDate,
      nextRun: runDate,
      targets
    });
    await notification.save();
    scheduleNotification(notification);
    res.status(200).json({
      success: true,
      message: 'Notificação agendada com sucesso',
      data: notification
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Error scheduling notification';
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({}, 'status nextRun targets message');
    res.status(200).json({
      success: true,
      message: 'Notificações obtidas com sucesso',
      data: notifications
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Error fetching notifications';
    next(err);
  }
});

module.exports = router;

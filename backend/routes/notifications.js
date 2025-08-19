const express = require('express');
const Notification = require('../models/Notification');
const { scheduleNotification } = require('../services/notificationScheduler');

const router = express.Router();

function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

router.post('/schedule', async (req, res) => {
  try {
    const { message, runAt, targets } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: '"message" is required' });
    }
    if (!isValidDate(runAt)) {
      return res.status(400).json({ message: 'Invalid "runAt" value' });
    }
    if (!Array.isArray(targets) || !targets.every(t => typeof t === 'string')) {
      return res.status(400).json({ message: '"targets" must be an array of strings' });
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
    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error scheduling notification' });
  }
});

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({}, 'status nextRun targets message');
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

module.exports = router;

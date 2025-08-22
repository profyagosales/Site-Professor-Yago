const cron = require('node-cron');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const emailService = require('./emailService');

const jobs = new Map();

function toCron(date) {
  return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
}

async function resolveRecipients(notification) {
  const recipients = new Set(notification.emails || []);
  if (notification.classIds && notification.classIds.length > 0) {
    const students = await Student.find({ class: { $in: notification.classIds } })
      .select('email')
      .lean();
    students.forEach(s => {
      if (s.email) recipients.add(s.email);
    });
  }
  return Array.from(recipients);
}

async function sendNotification(notification) {
  try {
    const targets = await resolveRecipients(notification);
    for (const to of targets) {
      await emailService.sendEmail({ to, subject: 'Notificação', html: notification.message });
    }
    notification.status = 'sent';
    notification.nextRun = null;
    await notification.save();
  } catch (err) {
    console.error('Erro ao enviar notificação', err);
    notification.status = 'failed';
    await notification.save();
    throw err;
  }
}

function scheduleNotification(notification) {
  if (!notification) return;
  const runDate = notification.nextRun || notification.sendAt;
  if (!runDate || new Date(runDate) < new Date()) {
    sendNotification(notification);
    return;
  }

  const cronExpression = toCron(new Date(runDate));

  const job = cron.schedule(cronExpression, async () => {
    await sendNotification(notification);
    job.stop();
    jobs.delete(notification._id.toString());
  });

  jobs.set(notification._id.toString(), job);
}

async function loadScheduledNotifications() {
  const notifications = await Notification.find({ status: 'scheduled' });
  notifications.forEach(scheduleNotification);
}

module.exports = {
  scheduleNotification,
  loadScheduledNotifications,
  sendNotification
};


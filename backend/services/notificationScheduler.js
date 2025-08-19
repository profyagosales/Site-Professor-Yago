const cron = require('node-cron');
const Notification = require('../models/Notification');
const emailService = require('./emailService');

const jobs = new Map();

function toCron(date) {
  return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
}

function scheduleNotification(notification) {
  if (!notification) return;
  const runDate = notification.nextRun || notification.runAt;
  if (!runDate || new Date(runDate) < new Date()) return;

  const cronExpression = toCron(new Date(runDate));

  const job = cron.schedule(cronExpression, async () => {
    try {
      const targets = notification.targets || [];
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
    } finally {
      job.stop();
      jobs.delete(notification._id.toString());
    }
  });

  jobs.set(notification._id.toString(), job);
}

async function loadScheduledNotifications() {
  const notifications = await Notification.find({ status: 'scheduled' });
  notifications.forEach(scheduleNotification);
}

module.exports = {
  scheduleNotification,
  loadScheduledNotifications
};


const express = require('express');
const Notification = require('../models/Notification');
const { scheduleNotification, sendNotification } = require('../services/notificationScheduler');

const router = express.Router();

function isValidDate(value) {
  if (value === null || value === undefined) return true;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

router.post('/', async (req, res, next) => {
  try {
    const { message, sendAt = null, classIds = [], emails = [] } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      const error = new Error('Campo "message" é obrigatório');
      error.status = 400;
      throw error;
    }
    if (!isValidDate(sendAt)) {
      const error = new Error('Valor "sendAt" inválido');
      error.status = 400;
      throw error;
    }
    if (!Array.isArray(classIds) || !classIds.every(t => typeof t === 'string')) {
      const error = new Error('Campo "classIds" deve ser um array de strings');
      error.status = 400;
      throw error;
    }
    if (!Array.isArray(emails) || !emails.every(t => typeof t === 'string')) {
      const error = new Error('Campo "emails" deve ser um array de strings');
      error.status = 400;
      throw error;
    }

    const sendDate = sendAt ? new Date(sendAt) : null;
    const notification = new Notification({
      message,
      sendAt: sendDate,
      nextRun: sendDate,
      classIds,
      emails
    });
    await notification.save();

    if (sendDate) {
      scheduleNotification(notification);
      res.status(200).json({
        success: true,
        message: 'Notificação agendada com sucesso',
        data: notification
      });
    } else {
      await sendNotification(notification);
      res.status(200).json({
        success: true,
        message: 'Notificação enviada com sucesso',
        data: notification
      });
    }
  } catch (err) {
    if (!err.status) {
      err.status = 500;
      err.message = 'Erro ao processar notificação';
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({}, 'status nextRun classIds emails message sendAt');
    res.status(200).json({
      success: true,
      message: 'Notificações obtidas com sucesso',
      data: notifications
    });
  } catch (err) {
    err.status = 500;
    err.message = 'Erro ao buscar notificações';
    next(err);
  }
});

module.exports = router;

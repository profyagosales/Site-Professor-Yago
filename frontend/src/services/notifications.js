import api, { pickData } from '@/services/api';

export const getNotifications = () =>
  api.get('/notifications').then(pickData);

export const scheduleNotification = (notification) =>
  api.post('/notifications/schedule', notification).then(pickData);

export default {
  getNotifications,
  scheduleNotification,
};


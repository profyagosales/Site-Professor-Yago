import api, { pickData, toArray } from '@/services/api';

export const getNotifications = async () => {
  const res = await api.get('/notifications');
  return res.data;
};

export const scheduleNotification = async (notification) => {
  const res = await api.post('/notifications/schedule', notification);
  return res.data;
};

export default {
  getNotifications,
  scheduleNotification,
};


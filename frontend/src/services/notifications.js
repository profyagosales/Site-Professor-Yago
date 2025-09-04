import { api, pickData } from '@/services/api';

export const getNotifications = () =>
  api.get('/notifications').then(pickData);

export const createNotification = (payload) =>
  api.post('/notifications', payload).then(pickData);

export default {
  getNotifications,
  createNotification,
};


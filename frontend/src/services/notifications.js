import { api, pickData } from '@/lib/api';

export const getNotifications = () =>
  api.get('/api/notifications').then(pickData);

export const createNotification = (payload) =>
  api.post('/api/notifications', payload).then(pickData);

export default {
  getNotifications,
  createNotification,
};


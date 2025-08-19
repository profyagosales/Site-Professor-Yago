import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const getNotifications = async () => {
  const res = await axios.get(`${API_URL}/notifications`);
  return res.data;
};

export const scheduleNotification = async (notification) => {
  const res = await axios.post(`${API_URL}/notifications/schedule`, notification);
  return res.data;
};

export default {
  getNotifications,
  scheduleNotification,
};


import api, { pickData } from '@/services/api';

export const sendEmail = (body) =>
  api.post('/email/send', body).then(pickData);

export default {
  sendEmail,
};


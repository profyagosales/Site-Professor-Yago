import { api } from '@/services/api';

export async function sendEmail(payload) {
  return (await api.post('/email/send', payload))?.data;
}

export default {
  sendEmail,
};

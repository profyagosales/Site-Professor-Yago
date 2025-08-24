import { api } from '@/lib/api';

export async function sendEmail(payload) {
  return (await api.post('/api/email/send', payload))?.data;
}

export default {
  sendEmail,
};


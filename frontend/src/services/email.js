import { api } from '@/lib/api';

export async function sendEmail(payload) {
  const {
    subject,
    html,
    text,
    classIds = [],
    emails = [],
    copyTeachers,
  } = payload || {};

  const body = {
    subject,
    html,
    classIds,
    emails,
  };

  if (text) {
    body.text = text;
  }

  if (copyTeachers !== undefined) {
    body.copyTeachers = copyTeachers;
  }

  return (await api.post('/classes/email-bulk', body))?.data;
}

export default {
  sendEmail,
};


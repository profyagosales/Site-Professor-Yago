import { api } from '@/services/api';

export async function listAnnouncements({ teacherId, limit = 3 }) {
  if (!teacherId) return [];
  const { data } = await api.get(`/teachers/${teacherId}/announcements`, {
    params: { limit },
  });
  return data;
}

export async function createAnnouncement(payload) {
  const { data } = await api.post('/announcements', payload);
  return data;
}

export default {
  listAnnouncements,
  createAnnouncement,
};

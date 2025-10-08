import { api } from '@/lib/api';

export async function listAnnouncements({ teacherId, limit = 3, includeScheduled = false }) {
  if (!teacherId) return [];
  const { data } = await api.get(`/announcements/teacher/${teacherId}`, {
    params: { limit, includeScheduled },
  });
  return data?.data || data;
}

export async function listAnnouncementsForStudent({ studentId, limit = 5 }) {
  if (!studentId) return [];
  const { data } = await api.get(`/announcements/student/${studentId}`, { params: { limit } });
  return data?.data || data;
}

export async function createAnnouncement(payload) {
  const { data } = await api.post('/announcements', payload);
  return data?.data || data;
}

export default {
  listAnnouncements,
  listAnnouncementsForStudent,
  createAnnouncement,
}

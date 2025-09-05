import { api } from '@/services/api';

export interface Announcement {
  id: string;
  title?: string;
  message: string;
  date?: string;
  createdAt: string;
  publishAt?: string;
  teacherId: string;
  teacherName?: string;
  classId?: string;
  className?: string;
}

export interface AnnouncementsParams {
  limit?: number;
  page?: number;
  studentId?: string;
  teacherId?: string;
}

/**
 * Lista anúncios para um aluno específico
 */
export async function listStudentAnnouncements(
  studentId: string,
  params: AnnouncementsParams = {}
): Promise<Announcement[]> {
  const { data } = await api.get(`/students/${studentId}/announcements`, {
    params: {
      limit: params.limit || 10,
      page: params.page || 1,
      ...params,
    },
  });
  return data;
}

/**
 * Lista anúncios para um professor específico
 */
export async function listTeacherAnnouncements(
  teacherId: string,
  params: AnnouncementsParams = {}
): Promise<Announcement[]> {
  const { data } = await api.get(`/teachers/${teacherId}/announcements`, {
    params: {
      limit: params.limit || 10,
      page: params.page || 1,
      ...params,
    },
  });
  return data;
}

/**
 * Cria um novo anúncio
 */
export async function createAnnouncement(payload: {
  title?: string;
  message: string;
  publishAt?: string;
  classId?: string;
}): Promise<Announcement> {
  const { data } = await api.post('/announcements', payload);
  return data;
}

/**
 * Filtra anúncios para ocultar os agendados para o futuro
 */
export function filterPublishedAnnouncements(announcements: Announcement[]): Announcement[] {
  const now = new Date();
  return announcements.filter(announcement => {
    if (!announcement.publishAt) return true; // Se não tem publishAt, sempre mostrar
    return new Date(announcement.publishAt) <= now;
  });
}

/**
 * Ordena anúncios por data decrescente (mais recentes primeiro)
 */
export function sortAnnouncementsByDate(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort((a, b) => {
    const dateA = new Date(a.publishAt || a.createdAt);
    const dateB = new Date(b.publishAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Processa anúncios: filtra publicados e ordena por data
 */
export function processAnnouncements(announcements: Announcement[]): Announcement[] {
  const published = filterPublishedAnnouncements(announcements);
  return sortAnnouncementsByDate(published);
}

export default {
  listStudentAnnouncements,
  listTeacherAnnouncements,
  createAnnouncement,
  filterPublishedAnnouncements,
  sortAnnouncementsByDate,
  processAnnouncements,
};

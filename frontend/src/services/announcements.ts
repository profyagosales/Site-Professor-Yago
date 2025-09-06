import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  teacherId: string;
  classIds: string[];
  publishAt: string | null;
  status: 'draft' | 'scheduled' | 'published';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  isPublished: boolean;
  isScheduled: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  classIds: string[];
  publishAt?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdateAnnouncementData {
  title?: string;
  message?: string;
  classIds?: string[];
  publishAt?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Lista avisos para professores
 */
export async function listAnnouncements({ 
  status, 
  classId, 
  limit = 50 
}: { 
  status?: string; 
  classId?: string; 
  limit?: number; 
} = {}): Promise<Announcement[]> {
  try {
    const response = await api.get('/announcements', {
      params: { status, classId, limit }
    });
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar avisos:', error);
    throw error;
  }
}

/**
 * Lista avisos para alunos (apenas publicados)
 */
export async function listAnnouncementsForStudents(classIds: string[]): Promise<Announcement[]> {
  try {
    const response = await api.get('/announcements/for-students', {
      params: { classIds }
    });
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar avisos para alunos:', error);
    throw error;
  }
}

/**
 * Lista avisos para um aluno específico (alias para listAnnouncementsForStudents)
 */
export async function listStudentAnnouncements(classIds: string[]): Promise<Announcement[]> {
  return listAnnouncementsForStudents(classIds);
}

/**
 * Processa avisos para exibição (filtra e ordena)
 */
export function processAnnouncements(announcements: Announcement[]): Announcement[] {
  return announcements
    .filter(announcement => {
      // Filtrar apenas avisos publicados ou agendados para hoje
      const now = new Date();
      const publishAt = announcement.publishAt ? new Date(announcement.publishAt) : null;
      
      if (announcement.isPublished) return true;
      if (announcement.isScheduled && publishAt && publishAt <= now) return true;
      
      return false;
    })
    .sort((a, b) => {
      // Ordenar por data de publicação (mais recentes primeiro)
      const dateA = a.publishAt ? new Date(a.publishAt) : new Date(a.createdAt);
      const dateB = b.publishAt ? new Date(b.publishAt) : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
}

/**
 * Cria um novo aviso
 */
export async function createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  try {
    const response = await api.post('/announcements', data);
    const announcement = pickData(response);
    
    logger.info('Aviso criado com sucesso:', { 
      id: announcement.id, 
      title: announcement.title,
      status: announcement.status 
    });
    return announcement;
  } catch (error) {
    logger.error('Erro ao criar aviso:', error);
    throw error;
  }
}

/**
 * Atualiza um aviso existente
 */
export async function updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<Announcement> {
  try {
    const response = await api.put(`/announcements/${id}`, data);
    const announcement = pickData(response);
    
    logger.info('Aviso atualizado com sucesso:', { 
      id, 
      title: announcement.title,
      status: announcement.status 
    });
    return announcement;
  } catch (error) {
    logger.error('Erro ao atualizar aviso:', error);
    throw error;
  }
}

/**
 * Exclui um aviso
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    await api.delete(`/announcements/${id}`);
    
    logger.info('Aviso excluído com sucesso:', { id });
  } catch (error) {
    logger.error('Erro ao excluir aviso:', error);
    throw error;
  }
}

/**
 * Publica um aviso imediatamente
 */
export async function publishAnnouncement(id: string): Promise<Announcement> {
  try {
    const response = await api.patch(`/announcements/${id}/publish`);
    const announcement = pickData(response);
    
    logger.info('Aviso publicado com sucesso:', { id, title: announcement.title });
    return announcement;
  } catch (error) {
    logger.error('Erro ao publicar aviso:', error);
    throw error;
  }
}

/**
 * Agenda a publicação de um aviso
 */
export async function scheduleAnnouncement(id: string, publishAt: string): Promise<Announcement> {
  try {
    const response = await api.patch(`/announcements/${id}/schedule`, { publishAt });
    const announcement = pickData(response);
    
    logger.info('Aviso agendado com sucesso:', { 
      id, 
      title: announcement.title, 
      publishAt: announcement.publishAt 
    });
    return announcement;
  } catch (error) {
    logger.error('Erro ao agendar aviso:', error);
    throw error;
  }
}

/**
 * Cancela o agendamento de um aviso
 */
export async function cancelSchedule(id: string): Promise<Announcement> {
  try {
    const response = await api.patch(`/announcements/${id}/cancel-schedule`);
    const announcement = pickData(response);
    
    logger.info('Agendamento cancelado com sucesso:', { id, title: announcement.title });
    return announcement;
  } catch (error) {
    logger.error('Erro ao cancelar agendamento:', error);
    throw error;
  }
}

/**
 * Valida dados de aviso
 */
export function validateAnnouncement(data: CreateAnnouncementData | UpdateAnnouncementData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.title && data.title.trim().length === 0) {
    errors.push('Título é obrigatório');
  }
  
  if (data.title && data.title.length > 200) {
    errors.push('Título deve ter no máximo 200 caracteres');
  }
  
  if (data.message && data.message.trim().length === 0) {
    errors.push('Mensagem é obrigatória');
  }
  
  if (data.message && data.message.length > 2000) {
    errors.push('Mensagem deve ter no máximo 2000 caracteres');
  }
  
  if (data.classIds && (!Array.isArray(data.classIds) || data.classIds.length === 0)) {
    errors.push('Pelo menos uma turma deve ser selecionada');
  }
  
  if (data.publishAt && data.publishAt !== null) {
    const publishDate = new Date(data.publishAt);
    if (isNaN(publishDate.getTime())) {
      errors.push('Data de publicação inválida');
    }
  }
  
  if (data.priority && !['low', 'normal', 'high', 'urgent'].includes(data.priority)) {
    errors.push('Prioridade deve ser: low, normal, high ou urgent');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formata data para exibição
 */
export function formatPublishDate(dateString: string | null): string {
  if (!dateString) return 'Não agendado';
  
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtém status do aviso
 */
export function getAnnouncementStatus(announcement: Announcement): {
  status: string;
  color: string;
  icon: string;
} {
  if (announcement.isPublished) {
    return {
      status: 'Publicado',
      color: 'green',
      icon: '✓'
    };
  }
  
  if (announcement.isScheduled) {
    return {
      status: 'Agendado',
      color: 'blue',
      icon: '⏰'
    };
  }
  
  return {
    status: 'Rascunho',
    color: 'gray',
    icon: '📝'
  };
}

/**
 * Verifica se pode editar aviso
 */
export function canEditAnnouncement(announcement: Announcement): boolean {
  return announcement.isDraft || announcement.isScheduled;
}

/**
 * Gera opções de prioridade
 */
export function getPriorityOptions(): Array<{ value: string; label: string; color: string }> {
  return [
    { value: 'low', label: 'Baixa', color: 'gray' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'high', label: 'Alta', color: 'orange' },
    { value: 'urgent', label: 'Urgente', color: 'red' }
  ];
}

export default {
  listAnnouncements,
  listAnnouncementsForStudents,
  listStudentAnnouncements,
  processAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  scheduleAnnouncement,
  cancelSchedule,
  validateAnnouncement,
  formatPublishDate,
  getAnnouncementStatus,
  canEditAnnouncement,
  getPriorityOptions,
};

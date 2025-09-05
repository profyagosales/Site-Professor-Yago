import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

export interface Schedule {
  id: string;
  classId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subject: string;
  room?: string;
  teacherId: string;
  weekdayName: string;
  durationMinutes: number;
  durationFormatted: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleData {
  classId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subject: string;
  room?: string;
}

export interface UpdateScheduleData {
  weekday?: number;
  startTime?: string;
  endTime?: string;
  subject?: string;
  room?: string;
}

/**
 * Lista horários de uma turma
 */
export async function listSchedules(classId: string): Promise<Schedule[]> {
  try {
    const response = await api.get('/schedules', { params: { classId } });
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar horários:', error);
    throw error;
  }
}

/**
 * Cria um novo horário
 */
export async function createSchedule(data: CreateScheduleData): Promise<Schedule> {
  try {
    const response = await api.post('/schedules', data);
    const schedule = pickData(response);
    
    logger.info('Horário criado com sucesso:', { id: schedule.id, subject: schedule.subject });
    return schedule;
  } catch (error) {
    logger.error('Erro ao criar horário:', error);
    throw error;
  }
}

/**
 * Atualiza um horário existente
 */
export async function updateSchedule(id: string, data: UpdateScheduleData): Promise<Schedule> {
  try {
    const response = await api.put(`/schedules/${id}`, data);
    const schedule = pickData(response);
    
    logger.info('Horário atualizado com sucesso:', { id, subject: schedule.subject });
    return schedule;
  } catch (error) {
    logger.error('Erro ao atualizar horário:', error);
    throw error;
  }
}

/**
 * Exclui um horário
 */
export async function deleteSchedule(id: string): Promise<void> {
  try {
    await api.delete(`/schedules/${id}`);
    
    logger.info('Horário excluído com sucesso:', { id });
  } catch (error) {
    logger.error('Erro ao excluir horário:', error);
    throw error;
  }
}

/**
 * Obtém próximas aulas de uma turma
 */
export async function getUpcomingClasses(classId: string, limit: number = 5): Promise<Schedule[]> {
  try {
    const response = await api.get('/schedules/upcoming', { 
      params: { classId, limit } 
    });
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar próximas aulas:', error);
    throw error;
  }
}

/**
 * Obtém aulas de hoje de uma turma
 */
export async function getTodayClasses(classId: string): Promise<Schedule[]> {
  try {
    const response = await api.get('/schedules/today', { params: { classId } });
    return pickData(response);
  } catch (error) {
    logger.error('Erro ao carregar aulas de hoje:', error);
    throw error;
  }
}

/**
 * Valida horário
 */
export function validateSchedule(data: CreateScheduleData | UpdateScheduleData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.weekday !== undefined && (data.weekday < 0 || data.weekday > 6)) {
    errors.push('Dia da semana deve estar entre 0 (domingo) e 6 (sábado)');
  }
  
  if (data.startTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.startTime)) {
    errors.push('Horário de início deve estar no formato HH:mm');
  }
  
  if (data.endTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.endTime)) {
    errors.push('Horário de fim deve estar no formato HH:mm');
  }
  
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    if (endMinutes <= startMinutes) {
      errors.push('Horário de fim deve ser posterior ao horário de início');
    }
  }
  
  if (data.subject && data.subject.trim().length === 0) {
    errors.push('Matéria é obrigatória');
  }
  
  if (data.subject && data.subject.length > 100) {
    errors.push('Matéria deve ter no máximo 100 caracteres');
  }
  
  if (data.room && data.room.length > 50) {
    errors.push('Sala deve ter no máximo 50 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formata horário para exibição
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Formata duração em minutos para texto legível
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${mins}min`;
}

/**
 * Obtém nome do dia da semana
 */
export function getWeekdayName(weekday: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[weekday];
}

/**
 * Obtém abreviação do dia da semana
 */
export function getWeekdayShort(weekday: number): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[weekday];
}

/**
 * Gera opções de horário com incrementos de 5 minutos
 */
export function generateTimeOptions(): string[] {
  const options: string[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  
  return options;
}

/**
 * Verifica se dois horários se sobrepõem
 */
export function checkTimeOverlap(
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean {
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  return !(end1Min <= start2Min || end2Min <= start1Min);
}

/**
 * Organiza horários por dia da semana
 */
export function organizeSchedulesByWeekday(schedules: Schedule[]): { [weekday: number]: Schedule[] } {
  const organized: { [weekday: number]: Schedule[] } = {};
  
  // Inicializar todos os dias
  for (let i = 0; i < 7; i++) {
    organized[i] = [];
  }
  
  // Organizar horários
  schedules.forEach(schedule => {
    organized[schedule.weekday].push(schedule);
  });
  
  // Ordenar por horário de início
  Object.keys(organized).forEach(weekday => {
    organized[parseInt(weekday)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });
  
  return organized;
}

export default {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getUpcomingClasses,
  getTodayClasses,
  validateSchedule,
  formatTime,
  formatDuration,
  getWeekdayName,
  getWeekdayShort,
  generateTimeOptions,
  checkTimeOverlap,
  organizeSchedulesByWeekday,
};

/**
 * Serviços para gerenciamento de diário (caderno)
 * 
 * Funcionalidades:
 * - Lançamentos diários por turma
 * - Vistos e atividades por aluno
 * - Autosave com debounce
 * - Histórico de lançamentos
 */

import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';
import { debouncePromise } from '@/utils/debouncePromise';

export interface Student {
  id: string;
  name: string;
  email?: string;
  photo?: string;
}

export interface DiaryEntry {
  id?: string;
  studentId: string;
  studentName: string;
  isPresent: boolean;
  activity: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiaryData {
  id?: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: DiaryEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GetDiaryParams {
  classId: string;
  date: string;
}

export interface SaveDiaryParams {
  classId: string;
  date: string;
  entries: DiaryEntry[];
}

export interface GetDiaryHistoryParams {
  classId: string;
  dateFrom: string;
  dateTo: string;
}

export interface DiaryHistoryItem {
  date: string;
  entriesCount: number;
  presentCount: number;
  absentCount: number;
  hasActivities: boolean;
}

/**
 * Obtém dados do diário para uma turma e data específica
 */
export async function getDiary(params: GetDiaryParams): Promise<DiaryData> {
  try {
    const { classId, date } = params;
    
    const response = await api.get(`/diary/class/${classId}`, {
      params: { date },
    });
    
    const data = pickData(response);
    
    // Normaliza a resposta para formato consistente
    return {
      id: data.id,
      classId,
      date,
      entries: data.entries || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get diary data', {
      action: 'diary',
      classId: params.classId,
      date: params.date,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Salva dados do diário
 */
export async function saveDiary(params: SaveDiaryParams): Promise<DiaryData> {
  try {
    const { classId, date, entries } = params;
    
    const response = await api.post('/diary', {
      classId,
      date,
      entries,
    });
    
    logger.info('Diary saved successfully', {
      action: 'diary',
      classId,
      date,
      entriesCount: entries.length,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to save diary', {
      action: 'diary',
      classId: params.classId,
      date: params.date,
      entriesCount: params.entries.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém histórico do diário
 */
export async function getDiaryHistory(params: GetDiaryHistoryParams): Promise<DiaryHistoryItem[]> {
  try {
    const { classId, dateFrom, dateTo } = params;
    
    const response = await api.get(`/diary/class/${classId}/history`, {
      params: { dateFrom, dateTo },
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get diary history', {
      action: 'diary',
      classId: params.classId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém lista de alunos de uma turma
 */
export async function getClassStudents(classId: string): Promise<Student[]> {
  try {
    const response = await api.get(`/classes/${classId}/students`);
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get class students', {
      action: 'diary',
      classId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Valida entrada do diário
 */
export function validateDiaryEntry(entry: Partial<DiaryEntry>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry.studentId) {
    errors.push('ID do aluno é obrigatório');
  }
  
  if (typeof entry.isPresent !== 'boolean') {
    errors.push('Status de presença é obrigatório');
  }
  
  if (entry.activity && entry.activity.length > 500) {
    errors.push('Atividade deve ter no máximo 500 caracteres');
  }
  
  if (entry.notes && entry.notes.length > 1000) {
    errors.push('Observações devem ter no máximo 1000 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados completos do diário
 */
export function validateDiaryData(data: Partial<DiaryData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.classId) {
    errors.push('ID da turma é obrigatório');
  }
  
  if (!data.date) {
    errors.push('Data é obrigatória');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Data deve estar no formato YYYY-MM-DD');
  }
  
  if (!Array.isArray(data.entries)) {
    errors.push('Entradas devem ser um array');
  } else {
    data.entries.forEach((entry, index) => {
      const entryValidation = validateDiaryEntry(entry);
      if (!entryValidation.isValid) {
        errors.push(`Entrada ${index + 1}: ${entryValidation.errors.join(', ')}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formata data para exibição
 */
export function formatDiaryDate(date: string): string {
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Formata data para input
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Obtém data de hoje
 */
export function getTodayDate(): string {
  return formatDateForInput(new Date());
}

/**
 * Obtém data de ontem
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateForInput(yesterday);
}

/**
 * Obtém data de amanhã
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForInput(tomorrow);
}

/**
 * Obtém range de datas para histórico (últimos 7 dias)
 */
export function getLast7DaysRange(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6); // Inclui hoje, então 6 dias atrás
  
  return {
    dateFrom: formatDateForInput(sevenDaysAgo),
    dateTo: formatDateForInput(today),
  };
}

/**
 * Cria entrada padrão para um aluno
 */
export function createDefaultEntry(student: Student): DiaryEntry {
  return {
    studentId: student.id,
    studentName: student.name,
    isPresent: true,
    activity: '',
    notes: '',
  };
}

/**
 * Cria dados padrão do diário
 */
export function createDefaultDiaryData(classId: string, date: string, students: Student[]): DiaryData {
  return {
    classId,
    date,
    entries: students.map(createDefaultEntry),
  };
}

/**
 * Cria versão com debounce da função saveDiary
 */
export const saveDiaryDebounced = debouncePromise(saveDiary, 1000);

export default {
  getDiary,
  saveDiary,
  getDiaryHistory,
  getClassStudents,
  validateDiaryEntry,
  validateDiaryData,
  formatDiaryDate,
  formatDateForInput,
  getTodayDate,
  getYesterdayDate,
  getTomorrowDate,
  getLast7DaysRange,
  createDefaultEntry,
  createDefaultDiaryData,
  saveDiaryDebounced,
};

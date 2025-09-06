/**
 * Serviços para gerenciamento de turmas
 * 
 * Funcionalidades:
 * - CRUD completo de turmas
 * - Validações e tratamento de erros
 * - Integração com errorMap
 * - Suporte a atualização otimista
 */

import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http';
import { logger } from '@/lib/logger';

export interface ClassSchedule {
  day: string;
  slot: number;
  time: string;
}

export interface Class {
  id: string;
  _id?: string;
  name?: string;
  nome?: string;
  series: number;
  letter: string;
  discipline: string;
  disciplina?: string;
  schedule: ClassSchedule[];
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassPayload {
  series: number;
  letter: string;
  discipline: string;
  schedule: ClassSchedule[];
}

export interface UpdateClassPayload extends CreateClassPayload {
  id: string;
}

export interface ClassListResponse {
  items: Class[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Lista todas as turmas
 */
export async function listClasses(): Promise<Class[]> {
  try {
    const data = await httpGet<any>('/classes');
    
    // Normaliza a resposta para sempre retornar array
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data?.items && Array.isArray(data.items)) {
      return data.items;
    }
    
    return [];
  } catch (error) {
    logger.error('Failed to list classes', {
      action: 'classes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém uma turma por ID
 */
export async function getClassById(id: string): Promise<Class> {
  try {
    return httpGet<Class>(`/classes/${id}`);
  } catch (error) {
    logger.error('Failed to get class by ID', {
      action: 'classes',
      classId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Normaliza payload de horários para a API
 */
function normalizeSchedulePayload(payload: CreateClassPayload): CreateClassPayload {
  return {
    ...payload,
    schedule: Array.isArray(payload.schedule)
      ? payload.schedule
      : payload.schedule
        ? [payload.schedule]
        : [],
  };
}

/**
 * Cria uma nova turma
 */
export async function createClass(payload: CreateClassPayload): Promise<Class> {
  try {
    const normalizedPayload = normalizeSchedulePayload(payload);
    const data = await httpPost<Class>(
      '/classes',
      normalizedPayload,
    );

    logger.info('Class created successfully', {
      action: 'classes',
      classId: data?.id || data?._id,
      series: payload.series,
      letter: payload.letter,
    });
    return data;
  } catch (error) {
    logger.error('Failed to create class', {
      action: 'classes',
      payload: { series: payload.series, letter: payload.letter },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Atualiza uma turma existente
 */
export async function updateClass(id: string, payload: CreateClassPayload): Promise<Class> {
  try {
    const normalizedPayload = normalizeSchedulePayload(payload);
    const data = await httpPut<Class>(
      `/classes/${id}`,
      normalizedPayload,
    );

    logger.info('Class updated successfully', {
      action: 'classes',
      classId: id,
      series: payload.series,
      letter: payload.letter,
    });
    return data;
  } catch (error) {
    logger.error('Failed to update class', {
      action: 'classes',
      classId: id,
      payload: { series: payload.series, letter: payload.letter },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove uma turma
 */
export async function deleteClass(id: string): Promise<void> {
  try {
    await httpDelete(`/classes/${id}`);
    
    logger.info('Class deleted successfully', {
      action: 'classes',
      classId: id,
    });
  } catch (error) {
    logger.error('Failed to delete class', {
      action: 'classes',
      classId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Lista alunos de uma turma
 */
export async function listStudents(classId: string): Promise<any[]> {
  try {
    return httpGet<any[]>(`/classes/${classId}/students`);
  } catch (error) {
    logger.error('Failed to list students for class', {
      action: 'classes',
      classId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Verifica se uma turma pode ser removida (sem alunos)
 */
export async function canDeleteClass(id: string): Promise<boolean> {
  try {
    const students = await listStudents(id);
    return students.length === 0;
  } catch (error) {
    logger.error('Failed to check if class can be deleted', {
      action: 'classes',
      classId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Valida dados de uma turma
 */
export function validateClassData(payload: CreateClassPayload): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!payload.series || payload.series < 1 || payload.series > 9) {
    errors.series = 'Selecione uma série válida (1ª a 9ª)';
  }

  if (!payload.letter?.trim()) {
    errors.letter = 'Informe a letra da turma';
  } else if (payload.letter.trim().length > 2) {
    errors.letter = 'A letra deve ter no máximo 2 caracteres';
  }

  if (!payload.discipline?.trim()) {
    errors.discipline = 'Informe a disciplina';
  } else if (payload.discipline.trim().length > 50) {
    errors.discipline = 'A disciplina deve ter no máximo 50 caracteres';
  }

  if (!payload.schedule || payload.schedule.length === 0) {
    errors.schedule = 'Adicione pelo menos um horário';
  } else {
    const invalidSchedules = payload.schedule.filter(s => !s.day || !s.slot || !s.time);
    if (invalidSchedules.length > 0) {
      errors.schedule = 'Preencha todos os campos dos horários';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Gera nome da turma baseado na série e letra
 */
export function generateClassName(series: number, letter: string): string {
  return `${series}ª ${letter.toUpperCase()}`;
}

export default {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  listStudents,
  canDeleteClass,
  validateClassData,
  generateClassName,
};

/**
 * Serviços para gerenciamento de estudantes
 * 
 * Funcionalidades:
 * - CRUD completo de estudantes
 * - Busca e paginação
 * - Convite por e-mail
 * - Validações e tratamento de erros
 */

import { api, pickData } from '@/services/api';
import { logger } from '@/lib/logger';

export interface Student {
  id: string;
  _id?: string;
  name: string;
  nome?: string;
  email: string;
  phone?: string;
  number?: number;
  photo?: string;
  photoUrl?: string;
  classId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentListParams {
  classId: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentListResponse {
  items: Student[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InviteStudentParams {
  classId: string;
  email: string;
}

export interface InviteStudentResponse {
  inviteUrl: string;
  expiresAt: string;
  studentId?: string;
}

export interface CreateStudentPayload {
  name: string;
  email: string;
  phone?: string;
  number?: number;
  password?: string;
  photoFile?: File;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {
  id: string;
}

/**
 * Lista estudantes de uma turma com busca e paginação
 */
export async function listStudents(params: StudentListParams): Promise<StudentListResponse> {
  try {
    const { classId, q, page = 1, pageSize = 10 } = params;
    
    const response = await api.get(`/classes/${classId}/students`, {
      params: {
        q,
        page,
        pageSize,
      },
    });
    
    const data = pickData(response);
    
    // Normaliza a resposta para sempre retornar formato consistente
    if (Array.isArray(data)) {
      return {
        items: data,
        page: 1,
        pageSize: data.length,
        total: data.length,
        totalPages: 1,
      };
    }
    
    if (data?.items && Array.isArray(data.items)) {
      return {
        items: data.items,
        page: data.page || 1,
        pageSize: data.pageSize || 10,
        total: data.total || data.items.length,
        totalPages: Math.ceil((data.total || data.items.length) / (data.pageSize || 10)),
      };
    }
    
    return {
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    };
  } catch (error) {
    logger.error('Failed to list students', {
      action: 'students',
      classId: params.classId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém um estudante por ID
 */
export async function getStudent(classId: string, studentId: string): Promise<Student> {
  try {
    const response = await api.get(`/classes/${classId}/students/${studentId}`);
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Cria um novo estudante
 */
export async function createStudent(classId: string, payload: CreateStudentPayload): Promise<Student> {
  try {
    const { photoFile, ...otherData } = payload;
    
    let data: any;
    let config: any = {};
    
    if (photoFile) {
      const formData = new FormData();
      formData.append('classId', classId);
      Object.entries(otherData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('photo', photoFile);
      data = formData;
      config.headers = { 'Content-Type': 'multipart/form-data' };
    } else {
      data = { ...otherData, classId };
    }
    
    const response = await api.post(`/classes/${classId}/students`, data, config);
    
    logger.info('Student created successfully', {
      action: 'students',
      classId,
      studentId: response.data?.id || response.data?._id,
      name: payload.name,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to create student', {
      action: 'students',
      classId,
      payload: { name: payload.name, email: payload.email },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Atualiza um estudante existente
 */
export async function updateStudent(classId: string, studentId: string, payload: Partial<CreateStudentPayload>): Promise<Student> {
  try {
    const { photoFile, ...otherData } = payload;
    
    let data: any;
    let config: any = {};
    
    if (photoFile) {
      const formData = new FormData();
      Object.entries(otherData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('photo', photoFile);
      data = formData;
      config.headers = { 'Content-Type': 'multipart/form-data' };
    } else {
      data = otherData;
    }
    
    const response = await api.put(`/classes/${classId}/students/${studentId}`, data, config);
    
    logger.info('Student updated successfully', {
      action: 'students',
      classId,
      studentId,
      name: payload.name,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to update student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove um estudante
 */
export async function removeStudent(classId: string, studentId: string): Promise<void> {
  try {
    await api.delete(`/classes/${classId}/students/${studentId}`);
    
    logger.info('Student removed successfully', {
      action: 'students',
      classId,
      studentId,
    });
  } catch (error) {
    logger.error('Failed to remove student', {
      action: 'students',
      classId,
      studentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Convida um estudante por e-mail
 */
export async function inviteStudent(params: InviteStudentParams): Promise<InviteStudentResponse> {
  try {
    const { classId, email } = params;
    
    const response = await api.post(`/classes/${classId}/students/invite`, {
      email,
    });
    
    logger.info('Student invited successfully', {
      action: 'students',
      classId,
      email,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to invite student', {
      action: 'students',
      classId: params.classId,
      email: params.email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Valida dados de um estudante
 */
export function validateStudentData(payload: CreateStudentPayload): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!payload.name?.trim()) {
    errors.name = 'Nome é obrigatório';
  } else if (payload.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres';
  } else if (payload.name.trim().length > 100) {
    errors.name = 'Nome deve ter no máximo 100 caracteres';
  }

  if (!payload.email?.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = 'E-mail inválido';
  }

  if (payload.phone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(payload.phone)) {
    errors.phone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
  }

  if (payload.number && (payload.number < 1 || payload.number > 999)) {
    errors.number = 'Número deve estar entre 1 e 999';
  }

  if (payload.password && payload.password.length < 6) {
    errors.password = 'Senha deve ter pelo menos 6 caracteres';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida dados de convite
 */
export function validateInviteData(email: string): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!email?.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'E-mail inválido';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Manter compatibilidade com código existente
export const list = listStudents;
export const create = createStudent;
export const update = updateStudent;
export const remove = removeStudent;

export default {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  removeStudent,
  inviteStudent,
  validateStudentData,
  validateInviteData,
  // Compatibilidade
  list,
  create,
  update,
  remove,
};
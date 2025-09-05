/**
 * Serviços para gerenciamento de notas
 * 
 * Funcionalidades:
 * - Matriz de notas editável
 * - Validações e tratamento de erros
 * - Debounce para evitar tempestade de PUTs
 * - Atualização otimista com rollback
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

export interface Assessment {
  id: string;
  title: string;
  type: 'exam' | 'homework' | 'project' | 'participation';
  weight: number;
  maxScore: number;
  date: string;
  isActive: boolean;
}

export interface Grade {
  id?: string;
  studentId: string;
  assessmentId: string;
  value: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeMatrix {
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
  classId: string;
  term: string;
}

export interface SaveGradeParams {
  studentId: string;
  assessmentId: string;
  value: number | null;
  classId: string;
  term: string;
}

export interface GetClassGradesParams {
  classId: string;
  term: string;
}

/**
 * Obtém a matriz de notas de uma turma
 */
export async function getClassGrades(params: GetClassGradesParams): Promise<GradeMatrix> {
  try {
    const { classId, term } = params;
    
    const response = await api.get(`/grades/class/${classId}`, {
      params: { term },
    });
    
    const data = pickData(response);
    
    // Normaliza a resposta para formato consistente
    return {
      students: data.students || [],
      assessments: data.assessments || [],
      grades: data.grades || [],
      classId,
      term,
    };
  } catch (error) {
    logger.error('Failed to get class grades', {
      action: 'grades',
      classId: params.classId,
      term: params.term,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Salva uma nota individual
 */
export async function saveGrade(params: SaveGradeParams): Promise<Grade> {
  try {
    const { studentId, assessmentId, value, classId, term } = params;
    
    const response = await api.post('/grades', {
      studentId,
      assessmentId,
      value,
      classId,
      term,
    });
    
    logger.info('Grade saved successfully', {
      action: 'grades',
      classId,
      term,
      studentId,
      assessmentId,
      value,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to save grade', {
      action: 'grades',
      classId: params.classId,
      term: params.term,
      studentId: params.studentId,
      assessmentId: params.assessmentId,
      value: params.value,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Salva múltiplas notas em lote
 */
export async function saveGradesBatch(grades: SaveGradeParams[]): Promise<Grade[]> {
  try {
    const response = await api.post('/grades/batch', { grades });
    
    logger.info('Grades batch saved successfully', {
      action: 'grades',
      count: grades.length,
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to save grades batch', {
      action: 'grades',
      count: grades.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Obtém notas de um estudante específico
 */
export async function getStudentGrades(studentId: string, term?: string): Promise<Grade[]> {
  try {
    const response = await api.get(`/grades/student/${studentId}`, {
      params: term ? { term } : {},
    });
    
    return pickData(response);
  } catch (error) {
    logger.error('Failed to get student grades', {
      action: 'grades',
      studentId,
      term,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Exporta notas da turma em PDF
 */
export async function exportClassPdf(classId: string, term?: string): Promise<Blob> {
  try {
    const response = await api.get(`/grades/class/${classId}/export`, {
      responseType: 'blob',
      params: term ? { term } : {},
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to export class PDF', {
      action: 'grades',
      classId,
      term,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Exporta notas de um estudante em PDF
 */
export async function exportStudentPdf(studentId: string, term?: string): Promise<Blob> {
  try {
    const response = await api.get(`/grades/student/${studentId}/export`, {
      responseType: 'blob',
      params: term ? { term } : {},
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to export student PDF', {
      action: 'grades',
      studentId,
      term,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Envia relatório de notas por e-mail
 */
export async function sendStudentReport(studentId: string, term?: string): Promise<void> {
  try {
    await api.post(`/grades/student/${studentId}/send`, {
      term,
    });
    
    logger.info('Student report sent successfully', {
      action: 'grades',
      studentId,
      term,
    });
  } catch (error) {
    logger.error('Failed to send student report', {
      action: 'grades',
      studentId,
      term,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Valida valor de nota
 */
export function validateGradeValue(value: number | null): { isValid: boolean; error?: string } {
  if (value === null) {
    return { isValid: true }; // Nota vazia é válida
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'Valor deve ser um número' };
  }
  
  if (value < 0 || value > 10) {
    return { isValid: false, error: 'Nota deve estar entre 0 e 10' };
  }
  
  // Verifica se tem no máximo 1 casa decimal
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  if (decimalPlaces > 1) {
    return { isValid: false, error: 'Nota deve ter no máximo 1 casa decimal' };
  }
  
  return { isValid: true };
}

/**
 * Formata valor de nota para exibição
 */
export function formatGradeValue(value: number | null): string {
  if (value === null) return '';
  return value.toFixed(1);
}

/**
 * Parse valor de nota da string de entrada
 */
export function parseGradeValue(input: string): number | null {
  if (!input.trim()) return null;
  
  const value = parseFloat(input);
  if (isNaN(value)) return null;
  
  return value;
}

/**
 * Calcula média ponderada de um estudante
 */
export function calculateStudentAverage(
  studentId: string,
  grades: Grade[],
  assessments: Assessment[]
): number | null {
  const studentGrades = grades.filter(g => g.studentId === studentId);
  
  if (studentGrades.length === 0) return null;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const assessment of assessments) {
    if (!assessment.isActive) continue;
    
    const grade = studentGrades.find(g => g.assessmentId === assessment.id);
    if (grade && grade.value !== null) {
      totalWeight += assessment.weight;
      weightedSum += (grade.value / assessment.maxScore) * assessment.weight;
    }
  }
  
  if (totalWeight === 0) return null;
  
  return (weightedSum / totalWeight) * 10; // Normaliza para escala 0-10
}

/**
 * Cria versão com debounce da função saveGrade
 */
export const saveGradeDebounced = debouncePromise(saveGrade, 800);

// Manter compatibilidade com código existente
export const getClassMatrix = getClassGrades;
export const getClassTotals = getClassGrades;
export const postGrade = saveGrade;

export default {
  getClassGrades,
  saveGrade,
  saveGradesBatch,
  getStudentGrades,
  exportClassPdf,
  exportStudentPdf,
  sendStudentReport,
  validateGradeValue,
  formatGradeValue,
  parseGradeValue,
  calculateStudentAverage,
  saveGradeDebounced,
  // Compatibilidade
  getClassMatrix,
  getClassTotals,
  postGrade,
};

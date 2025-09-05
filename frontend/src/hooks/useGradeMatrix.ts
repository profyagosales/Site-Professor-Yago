/**
 * Hook para gerenciamento da matriz de notas
 * 
 * Funcionalidades:
 * - Matriz editável com debounce
 * - Atualização otimista com rollback
 * - Validação de notas
 * - Navegação por teclado
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  getClassGrades, 
  saveGradeDebounced,
  validateGradeValue,
  formatGradeValue,
  parseGradeValue,
  calculateStudentAverage,
  type GradeMatrix,
  type Student,
  type Assessment,
  type Grade,
  type SaveGradeParams
} from '@/services/grades';
import { logger } from '@/lib/logger';

export interface UseGradeMatrixOptions {
  classId: string;
  term: string;
  // TTL do cache em ms (padrão 30s)
  cacheTtlMs?: number;
  // Se deve mostrar toasts de sucesso/erro
  showToasts?: boolean;
  // Se deve fazer log de ações
  enableLogging?: boolean;
}

export interface UseGradeMatrixReturn {
  // Dados
  matrix: GradeMatrix | null;
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
  
  // Estados
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Ações
  updateGrade: (studentId: string, assessmentId: string, value: string) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Utilitários
  getGrade: (studentId: string, assessmentId: string) => number | null;
  getStudentAverage: (studentId: string) => number | null;
  validateGrade: (value: string) => { isValid: boolean; error?: string };
  formatGrade: (value: number | null) => string;
  
  // Navegação
  focusCell: (studentIndex: number, assessmentIndex: number) => void;
  getCellId: (studentIndex: number, assessmentIndex: number) => string;
}

export function useGradeMatrix(options: UseGradeMatrixOptions): UseGradeMatrixReturn {
  const {
    classId,
    term,
    cacheTtlMs = 30000, // 30 segundos
    showToasts = true,
    enableLogging = true,
  } = options;

  // Estados
  const [matrix, setMatrix] = useState<GradeMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache de valores otimistas
  const [optimisticGrades, setOptimisticGrades] = useState<Map<string, number | null>>(new Map());
  
  // Refs para navegação
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Dados derivados
  const students = matrix?.students || [];
  const assessments = matrix?.assessments || [];
  const grades = matrix?.grades || [];

  // Carregar matriz de notas
  const loadMatrix = useCallback(async () => {
    if (!classId || !term) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getClassGrades({ classId, term });
      setMatrix(data);
      setOptimisticGrades(new Map()); // Limpa cache otimista
      
      if (enableLogging) {
        logger.info('Grade matrix loaded successfully', {
          action: 'grades',
          classId,
          term,
          studentsCount: data.students.length,
          assessmentsCount: data.assessments.length,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar notas';
      setError(errorMessage);
      
      if (enableLogging) {
        logger.error('Failed to load grade matrix', {
          action: 'grades',
          classId,
          term,
          error: errorMessage,
        });
      }
      
      if (showToasts) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [classId, term, enableLogging, showToasts]);

  // Carregar automaticamente
  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Atualizar nota com debounce
  const updateGrade = useCallback((studentId: string, assessmentId: string, value: string) => {
    // Validação
    const parsedValue = parseGradeValue(value);
    const validation = validateGradeValue(parsedValue);
    
    if (!validation.isValid) {
      if (showToasts) {
        toast.error(validation.error || 'Valor inválido');
      }
      return;
    }

    // Atualização otimista
    const key = `${studentId}-${assessmentId}`;
    setOptimisticGrades(prev => new Map(prev.set(key, parsedValue)));
    
    // Salvar com debounce
    setIsSaving(true);
    
    saveGradeDebounced({
      studentId,
      assessmentId,
      value: parsedValue,
      classId,
      term,
    })
      .then(() => {
        // Sucesso: atualizar matriz real
        setMatrix(prev => {
          if (!prev) return prev;
          
          const updatedGrades = [...prev.grades];
          const existingIndex = updatedGrades.findIndex(
            g => g.studentId === studentId && g.assessmentId === assessmentId
          );
          
          if (existingIndex >= 0) {
            updatedGrades[existingIndex] = {
              ...updatedGrades[existingIndex],
              value: parsedValue,
              updatedAt: new Date().toISOString(),
            };
          } else {
            updatedGrades.push({
              studentId,
              assessmentId,
              value: parsedValue,
              createdAt: new Date().toISOString(),
            });
          }
          
          return {
            ...prev,
            grades: updatedGrades,
          };
        });
        
        // Limpar cache otimista
        setOptimisticGrades(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        
        if (enableLogging) {
          logger.info('Grade updated successfully', {
            action: 'grades',
            classId,
            term,
            studentId,
            assessmentId,
            value: parsedValue,
          });
        }
      })
      .catch((err) => {
        // Erro: rollback
        setOptimisticGrades(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        
        const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar nota';
        
        if (enableLogging) {
          logger.error('Failed to update grade', {
            action: 'grades',
            classId,
            term,
            studentId,
            assessmentId,
            value: parsedValue,
            error: errorMessage,
          });
        }
        
        if (showToasts) {
          toast.error(errorMessage);
        }
      })
      .finally(() => {
        setIsSaving(false);
      });
  }, [classId, term, showToasts, enableLogging]);

  // Obter nota (otimista ou real)
  const getGrade = useCallback((studentId: string, assessmentId: string): number | null => {
    const key = `${studentId}-${assessmentId}`;
    
    // Verifica cache otimista primeiro
    if (optimisticGrades.has(key)) {
      return optimisticGrades.get(key)!;
    }
    
    // Senão, busca na matriz real
    const grade = grades.find(g => g.studentId === studentId && g.assessmentId === assessmentId);
    return grade?.value || null;
  }, [grades, optimisticGrades]);

  // Calcular média do estudante
  const getStudentAverage = useCallback((studentId: string): number | null => {
    return calculateStudentAverage(studentId, grades, assessments);
  }, [grades, assessments]);

  // Focar em célula específica
  const focusCell = useCallback((studentIndex: number, assessmentIndex: number) => {
    const cellId = getCellId(studentIndex, assessmentIndex);
    const cell = cellRefs.current.get(cellId);
    
    if (cell) {
      cell.focus();
      cell.select();
    }
  }, []);

  // Gerar ID da célula
  const getCellId = useCallback((studentIndex: number, assessmentIndex: number): string => {
    return `grade-${studentIndex}-${assessmentIndex}`;
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Dados
    matrix,
    students,
    assessments,
    grades,
    
    // Estados
    isLoading,
    isSaving,
    error,
    
    // Ações
    updateGrade,
    refresh: loadMatrix,
    clearError,
    
    // Utilitários
    getGrade,
    getStudentAverage,
    validateGrade: validateGradeValue,
    formatGrade: formatGradeValue,
    
    // Navegação
    focusCell,
    getCellId,
  };
}

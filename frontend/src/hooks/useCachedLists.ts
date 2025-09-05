/**
 * Hooks específicos para listas com cache
 *
 * Hooks otimizados para:
 * - Lista de redações
 * - Lista de turmas
 * - Lista de alunos
 * - Lista de alunos por turma
 */

import { useCallback } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { api } from '@/services/api';

// Tipos para as listas
export interface Essay {
  id: string;
  title: string;
  studentName: string;
  status: 'pending' | 'graded';
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  classId: string;
  createdAt: string;
}

export interface ClassStudent extends Student {
  className: string;
}

// Hook para lista de redações
export function useCachedEssays(
  filters: {
    status?: string;
    classId?: string;
    bimester?: string;
    type?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const cacheKey = `essays_${JSON.stringify(filters)}`;

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/essays?${params.toString()}`);
    return response.data;
  }, [filters]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 30000, // 30s
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para lista de turmas
export function useCachedClasses() {
  const cacheKey = 'classes_list';

  const fetcher = useCallback(async () => {
    const response = await api.get('/classes');
    return response.data;
  }, []);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 60000, // 1 minuto (turmas mudam menos)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para lista de alunos
export function useCachedStudents(
  filters: {
    classId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const cacheKey = `students_${JSON.stringify(filters)}`;

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/students?${params.toString()}`);
    return response.data;
  }, [filters]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 45000, // 45s
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para alunos de uma turma específica
export function useCachedClassStudents(classId: string) {
  const cacheKey = `class_students_${classId}`;

  const fetcher = useCallback(async () => {
    const response = await api.get(`/classes/${classId}/students`);
    return response.data;
  }, [classId]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 60000, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para estatísticas gerais
export function useCachedStats() {
  const cacheKey = 'stats_general';

  const fetcher = useCallback(async () => {
    const response = await api.get('/stats');
    return response.data;
  }, []);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 120000, // 2 minutos (stats mudam menos)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para dados de uma turma específica
export function useCachedClass(classId: string) {
  const cacheKey = `class_${classId}`;

  const fetcher = useCallback(async () => {
    const response = await api.get(`/classes/${classId}`);
    return response.data;
  }, [classId]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 60000, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para dados de um aluno específico
export function useCachedStudent(studentId: string) {
  const cacheKey = `student_${studentId}`;

  const fetcher = useCallback(async () => {
    const response = await api.get(`/students/${studentId}`);
    return response.data;
  }, [studentId]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 60000, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para redações de um aluno específico
export function useCachedStudentEssays(
  studentId: string,
  filters: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const cacheKey = `student_essays_${studentId}_${JSON.stringify(filters)}`;

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(
      `/students/${studentId}/essays?${params.toString()}`
    );
    return response.data;
  }, [studentId, filters]);

  return useCachedQuery(cacheKey, fetcher, {
    ttlMs: 30000, // 30s
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook para invalidar caches relacionados
export function useCacheInvalidation() {
  const invalidateEssays = useCallback(() => {
    // Remove todos os caches de redações
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_essays_')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateClasses = useCallback(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_classes_') || key.startsWith('cache_class_')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateStudents = useCallback(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (
        key.startsWith('cache_students_') ||
        key.startsWith('cache_student_')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const invalidateAll = useCallback(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  return {
    invalidateEssays,
    invalidateClasses,
    invalidateStudents,
    invalidateAll,
  };
}

/**
 * Serviços para dashboard do professor
 * 
 * Funcionalidades:
 * - Resumo com contagens e dados principais
 * - Cache integrado para performance
 * - Telemetria leve para monitoramento
 */

import { api } from './api';
import { logger } from '@/lib/logger';

export interface ProfessorSummary {
  pendingEssays: number;
  recentAnnouncements: number;
  upcomingExams: number;
  totalStudents: number;
  activeClasses: number;
  lastLogin?: string;
}

export interface DashboardStats {
  essays: {
    pending: number;
    corrected: number;
    total: number;
  };
  announcements: {
    recent: number;
    total: number;
  };
  exams: {
    upcoming: number;
    total: number;
  };
  students: {
    total: number;
    active: number;
  };
  classes: {
    total: number;
    active: number;
  };
}

/**
 * Obtém resumo do professor com dados principais
 */
export async function getProfessorSummary(): Promise<ProfessorSummary> {
  try {
    const response = await api.get('/teacher/summary');
    
    // Log de telemetria em DEV
    if (process.env.NODE_ENV === 'development') {
      logger.info('prof_summary_view', {
        action: 'dashboard',
        component: 'ProfessorSummary',
        timestamp: new Date().toISOString(),
      });
    }
    
    return response.data;
  } catch (error) {
    // Log do erro
    logger.error('Failed to fetch professor summary', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Retorna dados padrão em caso de erro
    return {
      pendingEssays: 0,
      recentAnnouncements: 0,
      upcomingExams: 0,
      totalStudents: 0,
      activeClasses: 0,
    };
  }
}

/**
 * Obtém estatísticas detalhadas do dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api.get('/teacher/dashboard-stats');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Retorna dados padrão em caso de erro
    return {
      essays: { pending: 0, corrected: 0, total: 0 },
      announcements: { recent: 0, total: 0 },
      exams: { upcoming: 0, total: 0 },
      students: { total: 0, active: 0 },
      classes: { total: 0, active: 0 },
    };
  }
}

/**
 * Obtém dados de redações pendentes
 */
export async function getPendingEssays(): Promise<{
  count: number;
  essays: Array<{
    id: string;
    studentName: string;
    topic: string;
    submittedAt: string;
    className: string;
  }>;
}> {
  try {
    const response = await api.get('/teacher/pending-essays');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch pending essays', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { count: 0, essays: [] };
  }
}

/**
 * Obtém avisos recentes
 */
export async function getRecentAnnouncements(): Promise<{
  count: number;
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: string;
    className?: string;
  }>;
}> {
  try {
    const response = await api.get('/teacher/recent-announcements');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch recent announcements', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { count: 0, announcements: [] };
  }
}

/**
 * Obtém próximas avaliações
 */
export async function getUpcomingExams(): Promise<{
  count: number;
  exams: Array<{
    id: string;
    title: string;
    date: string;
    className: string;
    type: string;
  }>;
}> {
  try {
    const response = await api.get('/teacher/upcoming-exams');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch upcoming exams', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { count: 0, exams: [] };
  }
}

/**
 * Obtém estatísticas de turmas
 */
export async function getClassStats(): Promise<{
  total: number;
  active: number;
  classes: Array<{
    id: string;
    name: string;
    studentCount: number;
    isActive: boolean;
  }>;
}> {
  try {
    const response = await api.get('/teacher/class-stats');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch class stats', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { total: 0, active: 0, classes: [] };
  }
}

/**
 * Obtém estatísticas de alunos
 */
export async function getStudentStats(): Promise<{
  total: number;
  active: number;
  students: Array<{
    id: string;
    name: string;
    className: string;
    isActive: boolean;
  }>;
}> {
  try {
    const response = await api.get('/teacher/student-stats');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch student stats', {
      action: 'dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { total: 0, active: 0, students: [] };
  }
}

/**
 * Hook para obter resumo do professor com cache
 */
export function useProfessorSummary() {
  // Este hook será implementado quando integrarmos com useCachedQuery
  // Por enquanto, retorna uma função que pode ser usada diretamente
  return {
    getSummary: getProfessorSummary,
    getStats: getDashboardStats,
    getPendingEssays,
    getRecentAnnouncements,
    getUpcomingExams,
    getClassStats,
    getStudentStats,
  };
}

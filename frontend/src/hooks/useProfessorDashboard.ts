/**
 * Hook para dashboard do professor com cache
 * 
 * Funcionalidades:
 * - Cache stale-while-revalidate para performance
 * - Dados do resumo do professor
 * - Telemetria leve
 * - Estados de loading e erro
 */

import { useCachedQuery } from './useCachedQuery';
import { 
  getProfessorSummary, 
  getDashboardStats,
  getPendingEssays,
  getRecentAnnouncements,
  getUpcomingExams,
  getClassStats,
  getStudentStats,
  type ProfessorSummary,
  type DashboardStats
} from '@/services/dashboard';
import { logger } from '@/lib/logger';

export interface UseProfessorDashboardOptions {
  // TTL do cache em ms (padrão 30s)
  cacheTtlMs?: number;
  // Se deve habilitar telemetria
  enableTelemetry?: boolean;
  // Se deve refetch automático
  autoRefetch?: boolean;
}

export interface UseProfessorDashboardReturn {
  // Dados principais
  summary: ProfessorSummary | null;
  stats: DashboardStats | null;
  
  // Estados
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  
  // Ações
  refresh: () => void;
  refreshSummary: () => void;
  refreshStats: () => void;
  
  // Dados específicos
  pendingEssays: {
    count: number;
    essays: Array<{
      id: string;
      studentName: string;
      topic: string;
      submittedAt: string;
      className: string;
    }>;
  } | null;
  
  recentAnnouncements: {
    count: number;
    announcements: Array<{
      id: string;
      title: string;
      message: string;
      createdAt: string;
      className?: string;
    }>;
  } | null;
  
  upcomingExams: {
    count: number;
    exams: Array<{
      id: string;
      title: string;
      date: string;
      className: string;
      type: string;
    }>;
  } | null;
  
  classStats: {
    total: number;
    active: number;
    classes: Array<{
      id: string;
      name: string;
      studentCount: number;
      isActive: boolean;
    }>;
  } | null;
  
  studentStats: {
    total: number;
    active: number;
    students: Array<{
      id: string;
      name: string;
      className: string;
      isActive: boolean;
    }>;
  } | null;
}

export function useProfessorDashboard(options: UseProfessorDashboardOptions = {}): UseProfessorDashboardReturn {
  const {
    cacheTtlMs = 30000, // 30 segundos
    enableTelemetry = true,
    autoRefetch = true,
  } = options;

  // Cache para resumo principal
  const {
    data: summary,
    isLoading: summaryLoading,
    isRefreshing: summaryRefreshing,
    error: summaryError,
    refresh: refreshSummary,
  } = useCachedQuery(
    'prof-summary',
    getProfessorSummary,
    { ttlMs: cacheTtlMs }
  );

  // Cache para estatísticas detalhadas
  const {
    data: stats,
    isLoading: statsLoading,
    isRefreshing: statsRefreshing,
    error: statsError,
    refresh: refreshStats,
  } = useCachedQuery(
    'prof-stats',
    getDashboardStats,
    { ttlMs: cacheTtlMs }
  );

  // Cache para redações pendentes
  const {
    data: pendingEssays,
    isLoading: essaysLoading,
    isRefreshing: essaysRefreshing,
    error: essaysError,
    refresh: refreshEssays,
  } = useCachedQuery(
    'prof-pending-essays',
    getPendingEssays,
    { ttlMs: cacheTtlMs }
  );

  // Cache para avisos recentes
  const {
    data: recentAnnouncements,
    isLoading: announcementsLoading,
    isRefreshing: announcementsRefreshing,
    error: announcementsError,
    refresh: refreshAnnouncements,
  } = useCachedQuery(
    'prof-recent-announcements',
    getRecentAnnouncements,
    { ttlMs: cacheTtlMs }
  );

  // Cache para próximas avaliações
  const {
    data: upcomingExams,
    isLoading: examsLoading,
    isRefreshing: examsRefreshing,
    error: examsError,
    refresh: refreshExams,
  } = useCachedQuery(
    'prof-upcoming-exams',
    getUpcomingExams,
    { ttlMs: cacheTtlMs }
  );

  // Cache para estatísticas de turmas
  const {
    data: classStats,
    isLoading: classesLoading,
    isRefreshing: classesRefreshing,
    error: classesError,
    refresh: refreshClasses,
  } = useCachedQuery(
    'prof-class-stats',
    getClassStats,
    { ttlMs: cacheTtlMs }
  );

  // Cache para estatísticas de alunos
  const {
    data: studentStats,
    isLoading: studentsLoading,
    isRefreshing: studentsRefreshing,
    error: studentsError,
    refresh: refreshStudents,
  } = useCachedQuery(
    'prof-student-stats',
    getStudentStats,
    { ttlMs: cacheTtlMs }
  );

  // Estados combinados
  const isLoading = summaryLoading || statsLoading || essaysLoading || 
                   announcementsLoading || examsLoading || classesLoading || studentsLoading;
  
  const isRefreshing = summaryRefreshing || statsRefreshing || essaysRefreshing ||
                      announcementsRefreshing || examsRefreshing || classesRefreshing || studentsRefreshing;
  
  const error = summaryError || statsError || essaysError || announcementsError ||
               examsError || classesError || studentsError;

  // Função para refresh completo
  const refresh = () => {
    refreshSummary();
    refreshStats();
    refreshEssays();
    refreshAnnouncements();
    refreshExams();
    refreshClasses();
    refreshStudents();
  };

  // Telemetria em DEV
  if (enableTelemetry && process.env.NODE_ENV === 'development' && summary) {
    logger.info('prof_dashboard_data_loaded', {
      action: 'dashboard',
      component: 'ProfessorDashboard',
      summary: {
        pendingEssays: summary.pendingEssays,
        recentAnnouncements: summary.recentAnnouncements,
        upcomingExams: summary.upcomingExams,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return {
    // Dados principais
    summary,
    stats,
    
    // Estados
    isLoading,
    isRefreshing,
    error,
    
    // Ações
    refresh,
    refreshSummary,
    refreshStats,
    
    // Dados específicos
    pendingEssays,
    recentAnnouncements,
    upcomingExams,
    classStats,
    studentStats,
  };
}

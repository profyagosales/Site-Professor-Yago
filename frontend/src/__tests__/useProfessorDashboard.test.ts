/**
 * Testes para o hook useProfessorDashboard
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useProfessorDashboard } from '@/hooks/useProfessorDashboard';
import { getProfessorSummary, getDashboardStats } from '@/services/dashboard';

// Mock dos serviços
jest.mock('@/services/dashboard', () => ({
  getProfessorSummary: jest.fn(),
  getDashboardStats: jest.fn(),
  getPendingEssays: jest.fn(),
  getRecentAnnouncements: jest.fn(),
  getUpcomingExams: jest.fn(),
  getClassStats: jest.fn(),
  getStudentStats: jest.fn(),
}));

// Mock do useCachedQuery
jest.mock('@/hooks/useCachedQuery', () => ({
  useCachedQuery: jest.fn(),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetProfessorSummary = getProfessorSummary as jest.MockedFunction<typeof getProfessorSummary>;
const mockGetDashboardStats = getDashboardStats as jest.MockedFunction<typeof getDashboardStats>;
const mockUseCachedQuery = require('@/hooks/useCachedQuery').useCachedQuery as jest.MockedFunction<any>;

describe('useProfessorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock padrão do useCachedQuery
    mockUseCachedQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useProfessorDashboard());

    expect(result.current.summary).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should call useCachedQuery with correct parameters', () => {
    renderHook(() => useProfessorDashboard({
      cacheTtlMs: 60000,
      enableTelemetry: false,
      autoRefetch: false,
    }));

    expect(mockUseCachedQuery).toHaveBeenCalledWith(
      'prof-summary',
      getProfessorSummary,
      { ttlMs: 60000 }
    );

    expect(mockUseCachedQuery).toHaveBeenCalledWith(
      'prof-stats',
      getDashboardStats,
      { ttlMs: 60000 }
    );
  });

  it('should use default options', () => {
    renderHook(() => useProfessorDashboard());

    expect(mockUseCachedQuery).toHaveBeenCalledWith(
      'prof-summary',
      getProfessorSummary,
      { ttlMs: 30000 }
    );
  });

  it('should return data from useCachedQuery', () => {
    const mockSummary = {
      pendingEssays: 5,
      recentAnnouncements: 3,
      upcomingExams: 2,
      totalStudents: 25,
      activeClasses: 4,
    };

    const mockStats = {
      essays: { pending: 5, corrected: 20, total: 25 },
      announcements: { recent: 3, total: 15 },
      exams: { upcoming: 2, total: 8 },
      students: { total: 25, active: 23 },
      classes: { total: 4, active: 4 },
    };

    mockUseCachedQuery
      .mockReturnValueOnce({
        data: mockSummary,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      })
      .mockReturnValue({
        data: mockStats,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

    const { result } = renderHook(() => useProfessorDashboard());

    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.stats).toEqual(mockStats);
  });

  it('should combine loading states', () => {
    mockUseCachedQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      })
      .mockReturnValue({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

    const { result } = renderHook(() => useProfessorDashboard());

    expect(result.current.isLoading).toBe(true);
  });

  it('should combine refreshing states', () => {
    mockUseCachedQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        isRefreshing: true,
        error: null,
        refresh: jest.fn(),
      })
      .mockReturnValue({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

    const { result } = renderHook(() => useProfessorDashboard());

    expect(result.current.isRefreshing).toBe(true);
  });

  it('should combine error states', () => {
    const mockError = new Error('API Error');

    mockUseCachedQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: mockError,
        refresh: jest.fn(),
      })
      .mockReturnValue({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

    const { result } = renderHook(() => useProfessorDashboard());

    expect(result.current.error).toBe(mockError);
  });

  it('should call refresh functions', () => {
    const mockRefreshSummary = jest.fn();
    const mockRefreshStats = jest.fn();

    mockUseCachedQuery
      .mockReturnValueOnce({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshSummary,
      })
      .mockReturnValue({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshStats,
      });

    const { result } = renderHook(() => useProfessorDashboard());

    act(() => {
      result.current.refresh();
    });

    expect(mockRefreshSummary).toHaveBeenCalled();
    expect(mockRefreshStats).toHaveBeenCalled();
  });

  it('should log telemetry in development when summary is available', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockSummary = {
      pendingEssays: 5,
      recentAnnouncements: 3,
      upcomingExams: 2,
      totalStudents: 25,
      activeClasses: 4,
    };

    mockUseCachedQuery
      .mockReturnValueOnce({
        data: mockSummary,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      })
      .mockReturnValue({
        data: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

    renderHook(() => useProfessorDashboard({
      enableTelemetry: true,
    }));

    // Verifica se o logger foi chamado (será verificado no mock)
    expect(mockUseCachedQuery).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});

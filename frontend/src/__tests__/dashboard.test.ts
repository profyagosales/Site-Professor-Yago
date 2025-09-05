/**
 * Testes para o serviço de dashboard do professor
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getProfessorSummary, getDashboardStats, getPendingEssays } from '@/services/dashboard';
import { api } from '@/services/api';
import { logger } from '@/lib/logger';

// Mock do api
const mockApiGet = jest.fn();
jest.mock('@/services/api', () => ({
  api: {
    get: mockApiGet,
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfessorSummary', () => {
    it('should fetch professor summary successfully', async () => {
      const mockSummary = {
        pendingEssays: 5,
        recentAnnouncements: 3,
        upcomingExams: 2,
        totalStudents: 25,
        activeClasses: 4,
        lastLogin: '2024-01-15T10:30:00Z',
      };

      mockApiGet.mockResolvedValueOnce({
        data: mockSummary,
      });

      const result = await getProfessorSummary();

      expect(result).toEqual(mockSummary);
    });

    it('should log telemetry in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockSummary = {
        pendingEssays: 5,
        recentAnnouncements: 3,
        upcomingExams: 2,
        totalStudents: 25,
        activeClasses: 4,
      };

      mockApiGet.mockResolvedValueOnce({
        data: mockSummary,
      });

      await getProfessorSummary();

      // O logger.info é chamado pelo interceptor da API, não diretamente
      expect(mockLogger.info).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should return default data on error', async () => {
      const error = new Error('Network error');
      mockApiGet.mockRejectedValueOnce(error);

      const result = await getProfessorSummary();

      expect(result).toEqual({
        pendingEssays: 0,
        recentAnnouncements: 0,
        upcomingExams: 0,
        totalStudents: 0,
        activeClasses: 0,
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unknown error', async () => {
      mockApiGet.mockRejectedValueOnce('Unknown error');

      const result = await getProfessorSummary();

      expect(result).toEqual({
        pendingEssays: 0,
        recentAnnouncements: 0,
        upcomingExams: 0,
        totalStudents: 0,
        activeClasses: 0,
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should fetch dashboard stats successfully', async () => {
      const mockStats = {
        essays: { pending: 5, corrected: 20, total: 25 },
        announcements: { recent: 3, total: 15 },
        exams: { upcoming: 2, total: 8 },
        students: { total: 25, active: 23 },
        classes: { total: 4, active: 4 },
      };

      mockApiGet.mockResolvedValueOnce({
        data: mockStats,
      });

      const result = await getDashboardStats();

      expect(result).toEqual(mockStats);
    });

    it('should return default data on error', async () => {
      const error = new Error('API error');
      mockApiGet.mockRejectedValueOnce(error);

      const result = await getDashboardStats();

      expect(result).toEqual({
        essays: { pending: 0, corrected: 0, total: 0 },
        announcements: { recent: 0, total: 0 },
        exams: { upcoming: 0, total: 0 },
        students: { total: 0, active: 0 },
        classes: { total: 0, active: 0 },
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getPendingEssays', () => {
    it('should fetch pending essays successfully', async () => {
      const mockEssays = {
        count: 3,
        essays: [
          {
            id: '1',
            studentName: 'João Silva',
            topic: 'Redação sobre meio ambiente',
            submittedAt: '2024-01-15T10:30:00Z',
            className: '9º Ano A',
          },
          {
            id: '2',
            studentName: 'Maria Santos',
            topic: 'Redação sobre tecnologia',
            submittedAt: '2024-01-15T11:00:00Z',
            className: '9º Ano B',
          },
        ],
      };

      mockApiGet.mockResolvedValueOnce({
        data: mockEssays,
      });

      const result = await getPendingEssays();

      expect(result).toEqual(mockEssays);
    });

    it('should return empty data on error', async () => {
      const error = new Error('Network error');
      mockApiGet.mockRejectedValueOnce(error);

      const result = await getPendingEssays();

      expect(result).toEqual({ count: 0, essays: [] });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

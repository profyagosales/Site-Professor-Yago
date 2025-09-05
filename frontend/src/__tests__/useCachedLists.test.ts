/**
 * Testes para os hooks de listas com cache
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCachedEssays,
  useCachedClasses,
  useCachedStudents,
} from '@/hooks/useCachedLists';
import { api } from '@/services/api';

// Mock da API
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock do cache
jest.mock('@/lib/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  hasFreshCache: jest.fn(),
  isStaleCache: jest.fn(),
  subscribeCache: jest.fn(),
  clearCache: jest.fn(),
}));

describe('useCachedLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCachedEssays', () => {
    it('should fetch essays with filters', async () => {
      const mockResponse = {
        data: {
          items: [{ id: '1', title: 'Essay 1' }],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const filters = {
        status: 'pending',
        classId: 'class1',
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => useCachedEssays(filters));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/essays?status=pending&classId=class1&page=1&pageSize=10'
        );
        expect(result.current.data).toEqual(mockResponse.data);
      });
    });

    it('should handle empty filters', async () => {
      const mockResponse = {
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
        },
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCachedEssays());

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/essays?');
        expect(result.current.data).toEqual(mockResponse.data);
      });
    });

    it('should handle API errors', async () => {
      jest.mocked(api.get).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCachedEssays());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
        expect(result.current.data).toBeNull();
      });
    });
  });

  describe('useCachedClasses', () => {
    it('should fetch classes', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Class 1' },
          { id: '2', name: 'Class 2' },
        ],
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCachedClasses());

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/classes');
        expect(result.current.data).toEqual(mockResponse.data);
      });
    });

    it('should handle API errors', async () => {
      jest.mocked(api.get).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCachedClasses());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
        expect(result.current.data).toBeNull();
      });
    });
  });

  describe('useCachedStudents', () => {
    it('should fetch students with filters', async () => {
      const mockResponse = {
        data: {
          items: [{ id: '1', name: 'Student 1' }],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const filters = {
        classId: 'class1',
        q: 'search',
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => useCachedStudents(filters));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/students?classId=class1&q=search&page=1&pageSize=10'
        );
        expect(result.current.data).toEqual(mockResponse.data);
      });
    });

    it('should handle empty filters', async () => {
      const mockResponse = {
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
        },
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCachedStudents());

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/students?');
        expect(result.current.data).toEqual(mockResponse.data);
      });
    });

    it('should handle API errors', async () => {
      jest.mocked(api.get).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCachedStudents());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
        expect(result.current.data).toBeNull();
      });
    });
  });

  describe('Cache Integration', () => {
    it('should use cache key based on filters', async () => {
      const { getCache } = await import('@/lib/cache');
      const { hasFreshCache } = await import('@/lib/cache');
      const { isStaleCache } = await import('@/lib/cache');

      jest.mocked(getCache).mockReturnValue({ items: [], total: 0 });
      jest.mocked(hasFreshCache).mockReturnValue(true);
      jest.mocked(isStaleCache).mockReturnValue(false);

      const filters = {
        status: 'pending',
        classId: 'class1',
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => useCachedEssays(filters));

      expect(result.current.data).toEqual({ items: [], total: 0 });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should fetch when cache is stale', async () => {
      const { getCache } = await import('@/lib/cache');
      const { hasFreshCache } = await import('@/lib/cache');
      const { isStaleCache } = await import('@/lib/cache');

      jest.mocked(getCache).mockReturnValue({ items: [], total: 0 });
      jest.mocked(hasFreshCache).mockReturnValue(false);
      jest.mocked(isStaleCache).mockReturnValue(true);

      const mockResponse = {
        data: { items: [], total: 0 },
      };

      jest.mocked(api.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCachedEssays());

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
        expect(result.current.isRefreshing).toBe(true);
      });
    });
  });
});

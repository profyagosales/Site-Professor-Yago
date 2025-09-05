/**
 * Testes para o hook useCachedQuery
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { clearCache } from '@/lib/cache';

// Mock do cache
jest.mock('@/lib/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  hasFreshCache: jest.fn(),
  isStaleCache: jest.fn(),
  subscribeCache: jest.fn(),
  clearCache: jest.fn(),
}));

describe('useCachedQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  it('should return loading state initially when no cache', async () => {
    const fetcher = jest.fn().mockResolvedValue('test-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return cached data immediately when available', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(true);
    jest.mocked(isStaleCache).mockReturnValue(false);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    expect(result.current.data).toBe('cached-data');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFresh).toBe(true);
    expect(result.current.isStale).toBe(false);
  });

  it('should fetch data when cache is stale', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');
    const { setCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('stale-data');
    jest.mocked(hasFreshCache).mockReturnValue(false);
    jest.mocked(isStaleCache).mockReturnValue(true);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    expect(result.current.data).toBe('stale-data');
    expect(result.current.isRefreshing).toBe(true);

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
      expect(setCache).toHaveBeenCalledWith('test-key', 'fresh-data', 30000);
    });
  });

  it('should handle fetch errors', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    await waitFor(() => {
      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should prevent duplicate requests', async () => {
    const fetcher = jest
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );

    const { result: result1 } = renderHook(() =>
      useCachedQuery('test-key', fetcher)
    );
    const { result: result2 } = renderHook(() =>
      useCachedQuery('test-key', fetcher)
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  it('should refresh data when refresh is called', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(true);
    jest.mocked(isStaleCache).mockReturnValue(false);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache when invalidate is called', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(true);
    jest.mocked(isStaleCache).mockReturnValue(false);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    act(() => {
      result.current.invalidate();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should respect enabled option', async () => {
    const fetcher = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() =>
      useCachedQuery('test-key', fetcher, { enabled: false })
    );

    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should refetch on mount when refetchOnMount is true', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(false);
    jest.mocked(isStaleCache).mockReturnValue(true);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() =>
      useCachedQuery('test-key', fetcher, { refetchOnMount: true })
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });
  });

  it('should not refetch on mount when refetchOnMount is false', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');

    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(false);
    jest.mocked(isStaleCache).mockReturnValue(true);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() =>
      useCachedQuery('test-key', fetcher, { refetchOnMount: false })
    );

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should handle subscription updates', async () => {
    const { getCache } = await import('@/lib/cache');
    const { hasFreshCache } = await import('@/lib/cache');
    const { isStaleCache } = await import('@/lib/cache');
    const { subscribeCache } = await import('@/lib/cache');

    let subscriptionCallback: (data: any) => void;
    const mockSubscribe = jest.fn().mockImplementation((key, callback) => {
      subscriptionCallback = callback;
      return { unsubscribe: jest.fn() };
    });

    jest.mocked(subscribeCache).mockImplementation(mockSubscribe);
    jest.mocked(getCache).mockReturnValue('cached-data');
    jest.mocked(hasFreshCache).mockReturnValue(true);
    jest.mocked(isStaleCache).mockReturnValue(false);

    const fetcher = jest.fn().mockResolvedValue('fresh-data');
    const { result } = renderHook(() => useCachedQuery('test-key', fetcher));

    // Simula atualização via subscription
    act(() => {
      subscriptionCallback('updated-data');
    });

    expect(result.current.data).toBe('updated-data');
  });

  it('should cleanup on unmount', async () => {
    const { subscribeCache } = await import('@/lib/cache');
    const mockUnsubscribe = jest.fn();
    const mockSubscribe = jest
      .fn()
      .mockReturnValue({ unsubscribe: mockUnsubscribe });

    jest.mocked(subscribeCache).mockImplementation(mockSubscribe);

    const fetcher = jest.fn().mockResolvedValue('data');
    const { unmount } = renderHook(() => useCachedQuery('test-key', fetcher));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

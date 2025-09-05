/**
 * Testes para o sistema de cache
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import cache, {
  getCache,
  setCache,
  hasFreshCache,
  isStaleCache,
  subscribeCache,
  deleteCache,
  clearCache,
} from '@/lib/cache';

// Mock do sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('Cache System', () => {
  beforeEach(() => {
    // Limpa o cache antes de cada teste
    clearCache();
    jest.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should set and get data', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data);
      const result = getCache(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = getCache('non-existent');
      expect(result).toBeNull();
    });

    it('should delete data', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data);
      expect(getCache(key)).toEqual(data);

      deleteCache(key);
      expect(getCache(key)).toBeNull();
    });

    it('should clear all data', () => {
      setCache('key1', 'data1');
      setCache('key2', 'data2');

      expect(getCache('key1')).toBe('data1');
      expect(getCache('key2')).toBe('data2');

      clearCache();

      expect(getCache('key1')).toBeNull();
      expect(getCache('key2')).toBeNull();
    });
  });

  describe('TTL and Freshness', () => {
    it('should respect TTL', async () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data, 100); // 100ms TTL

      expect(getCache(key)).toEqual(data);
      expect(hasFreshCache(key)).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(getCache(key)).toBeNull();
      expect(hasFreshCache(key)).toBe(false);
    });

    it('should mark data as stale after half TTL', async () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data, 1000); // 1s TTL

      expect(hasFreshCache(key)).toBe(true);
      expect(isStaleCache(key)).toBe(false);

      // Wait for half TTL
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(hasFreshCache(key)).toBe(false);
      expect(isStaleCache(key)).toBe(true);
      expect(getCache(key)).toEqual(data); // Still available
    });

    it('should use default TTL when not specified', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data);

      expect(getCache(key)).toEqual(data);
      expect(hasFreshCache(key)).toBe(true);
    });
  });

  describe('SessionStorage Integration', () => {
    it('should save to sessionStorage when enabled', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      setCache(key, data);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `cache_${key}`,
        expect.stringContaining('"data":{"message":"Hello World"}')
      );
    });

    it('should load from sessionStorage on initialization', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: 30000,
        isStale: false,
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(entry));

      // Simula inicialização
      cache.loadFromSessionStorage();

      expect(getCache(key)).toEqual(data);
    });

    it('should handle invalid sessionStorage data gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      expect(() => cache.loadFromSessionStorage()).not.toThrow();
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers when data changes', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const callback = jest.fn();

      const subscription = subscribeCache(key, callback);
      setCache(key, data);

      expect(callback).toHaveBeenCalledWith(data);
    });

    it('should allow unsubscribing', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const callback = jest.fn();

      const subscription = subscribeCache(key, callback);
      subscription.unsubscribe();

      setCache(key, data);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      subscribeCache(key, callback1);
      subscribeCache(key, callback2);

      setCache(key, data);

      expect(callback1).toHaveBeenCalledWith(data);
      expect(callback2).toHaveBeenCalledWith(data);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', () => {
      setCache('key1', 'data1', 1000);
      setCache('key2', 'data2', 1000);

      const stats = cache.getStats();

      expect(stats.total).toBe(2);
      expect(stats.fresh).toBe(2);
      expect(stats.stale).toBe(0);
      expect(stats.expired).toBe(0);
    });

    it('should track stale and expired entries', async () => {
      setCache('fresh', 'data1', 1000);
      setCache('stale', 'data2', 1000);

      // Wait for stale
      await new Promise(resolve => setTimeout(resolve, 600));

      const stats = cache.getStats();

      expect(stats.total).toBe(2);
      expect(stats.fresh).toBe(1);
      expect(stats.stale).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => setCache('key', 'data')).not.toThrow();
    });

    it('should handle subscription callback errors', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const callback = vi.fn(() => {
        throw new Error('Callback error');
      });

      subscribeCache(key, callback);

      expect(() => setCache(key, data)).not.toThrow();
    });
  });

  describe('Cache Size Limits', () => {
    it('should respect max size limit', () => {
      // Set max size to 2
      const cacheWithLimit = new (cache.constructor as any)({ maxSize: 2 });

      cacheWithLimit.set('key1', 'data1');
      cacheWithLimit.set('key2', 'data2');
      cacheWithLimit.set('key3', 'data3');

      expect(cacheWithLimit.get('key1')).toBeNull(); // Should be evicted
      expect(cacheWithLimit.get('key2')).toBe('data2');
      expect(cacheWithLimit.get('key3')).toBe('data3');
    });
  });
});

/**
 * Testes para o sistema de Web Vitals
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import {
  useVitals,
  useVitalsDebug,
  usePerformanceMarks,
} from '@/hooks/useVitals';

// Mock do web-vitals
jest.mock('web-vitals', () => ({
  getCLS: jest.fn(callback => {
    setTimeout(
      () =>
        callback({
          name: 'CLS',
          value: 0.1,
          delta: 0.1,
          id: 'cls-1',
          rating: 'good',
        }),
      100
    );
  }),
  getFID: jest.fn(callback => {
    setTimeout(
      () =>
        callback({
          name: 'FID',
          value: 50,
          delta: 50,
          id: 'fid-1',
          rating: 'good',
        }),
      100
    );
  }),
  getFCP: jest.fn(callback => {
    setTimeout(
      () =>
        callback({
          name: 'FCP',
          value: 1200,
          delta: 1200,
          id: 'fcp-1',
          rating: 'good',
        }),
      100
    );
  }),
  getLCP: jest.fn(callback => {
    setTimeout(
      () =>
        callback({
          name: 'LCP',
          value: 2000,
          delta: 2000,
          id: 'lcp-1',
          rating: 'good',
        }),
      100
    );
  }),
  getTTFB: jest.fn(callback => {
    setTimeout(
      () =>
        callback({
          name: 'TTFB',
          value: 600,
          delta: 600,
          id: 'ttfb-1',
          rating: 'good',
        }),
      100
    );
  }),
}));

// Mock do localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock do performance
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn().mockReturnValue({ duration: 100 }),
  clearMarks: jest.fn(),
  getEntriesByType: jest.fn().mockReturnValue([]),
  now: jest.fn().mockReturnValue(1000),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
});

describe('Web Vitals System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('0');
  });

  describe('useVitals', () => {
    it('should initialize vitals system', async () => {
      const { result } = renderHook(() => useVitals({ debug: true }));

      expect(result.current.isInitialized).toBe(false);

      await act(async () => {
        await result.current.init();
      });

      expect(result.current.isInitialized).toBe(true);
    });

    it('should not initialize when debug is disabled', async () => {
      const { result } = renderHook(() => useVitals({ debug: false }));

      await act(async () => {
        await result.current.init();
      });

      expect(result.current.isInitialized).toBe(false);
    });

    it('should initialize when localStorage debug is enabled', async () => {
      mockLocalStorage.getItem.mockReturnValue('1');

      const { result } = renderHook(() =>
        useVitals({ useLocalStorageDebug: true })
      );

      await act(async () => {
        await result.current.init();
      });

      expect(result.current.isInitialized).toBe(true);
    });

    it('should get metrics data', async () => {
      const { result } = renderHook(() => useVitals({ debug: true }));

      await act(async () => {
        await result.current.init();
      });

      // Aguarda métricas serem coletadas
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      const metrics = result.current.getMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('url');
      expect(metrics).toHaveProperty('userAgent');
    });

    it('should add performance marks', async () => {
      const { result } = renderHook(() => useVitals({ debug: true }));

      await act(async () => {
        await result.current.init();
      });

      act(() => {
        result.current.mark('test_mark', { detail: 'test' });
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith('test_mark', {
        detail: 'test',
      });
    });

    it('should measure performance', async () => {
      const { result } = renderHook(() => useVitals({ debug: true }));

      await act(async () => {
        await result.current.init();
      });

      act(() => {
        result.current.mark('start_mark');
        result.current.measure('test_measure', 'start_mark');
      });

      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test_measure',
        'start_mark',
        undefined
      );
    });

    it('should clear marks', async () => {
      const { result } = renderHook(() => useVitals({ debug: true }));

      await act(async () => {
        await result.current.init();
      });

      act(() => {
        result.current.clearMarks();
      });

      expect(mockPerformance.clearMarks).toHaveBeenCalled();
    });
  });

  describe('useVitalsDebug', () => {
    it('should toggle debug mode', async () => {
      const { result } = renderHook(() => useVitalsDebug());

      act(() => {
        result.current.toggleDebug();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('debug', '1');
    });

    it('should toggle debug mode off', async () => {
      mockLocalStorage.getItem.mockReturnValue('1');

      const { result } = renderHook(() => useVitalsDebug());

      act(() => {
        result.current.toggleDebug();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('debug', '0');
    });
  });

  describe('usePerformanceMarks', () => {
    it('should mark page load', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markPageLoad();
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith('page_load_start');
    });

    it('should mark page load end', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markPageLoad();
        result.current.markPageLoadEnd();
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith('page_load_end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'page_load_duration',
        'page_load_start',
        'page_load_end'
      );
    });

    it('should mark API call', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markApiCall('/test');
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith('api_call_start_/test');
    });

    it('should mark API call end', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markApiCall('/test');
        result.current.markApiCallEnd('/test');
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith('api_call_end_/test');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'api_call_duration_/test',
        'api_call_start_/test',
        'api_call_end_/test'
      );
    });

    it('should mark component render', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markComponentRender('TestComponent');
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'component_render_start_TestComponent'
      );
    });

    it('should mark component render end', async () => {
      const { result } = renderHook(() => usePerformanceMarks());

      act(() => {
        result.current.markComponentRender('TestComponent');
        result.current.markComponentRenderEnd('TestComponent');
      });

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'component_render_end_TestComponent'
      );
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'component_render_duration_TestComponent',
        'component_render_start_TestComponent',
        'component_render_end_TestComponent'
      );
    });
  });
});

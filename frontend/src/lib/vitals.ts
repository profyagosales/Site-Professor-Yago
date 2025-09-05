/**
 * Sistema de métricas de performance Web Vitals
 *
 * Objetivo:
 * - Medir LCP, FID, CLS sem vendor lock-in
 * - Debug-gated para não impactar produção
 * - Marcadores de performance para análise
 */

import {
  getCLS,
  getFID,
  getFCP,
  getLCP,
  getTTFB,
  type Metric,
} from 'web-vitals';

export interface VitalsConfig {
  // Se deve habilitar o debug
  debug?: boolean;
  // Se deve enviar métricas para analytics
  analytics?: boolean;
  // Callback personalizado para métricas
  onMetric?: (metric: Metric) => void;
  // Se deve logar no console
  consoleLog?: boolean;
  // Se deve usar localStorage para debug
  useLocalStorageDebug?: boolean;
}

export interface VitalsData {
  // Core Web Vitals
  lcp?: number;
  fid?: number;
  cls?: number;
  // Additional metrics
  fcp?: number;
  ttfb?: number;
  // Timestamp
  timestamp: number;
  // URL
  url: string;
  // User agent
  userAgent: string;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  detail?: any;
}

class VitalsManager {
  private config: VitalsConfig;
  private metrics: Map<string, Metric> = new Map();
  private marks: PerformanceMark[] = [];
  private isInitialized = false;

  constructor(config: VitalsConfig = {}) {
    this.config = {
      debug: false,
      analytics: false,
      consoleLog: true,
      useLocalStorageDebug: true,
      ...config,
    };
  }

  /**
   * Inicializa o sistema de vitals
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Verifica se deve habilitar debug
    const shouldDebug = this.shouldEnableDebug();

    if (!shouldDebug && !this.config.analytics) {
      return;
    }

    try {
      // Import dinâmico do web-vitals
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import(
        'web-vitals'
      );

      // Configura callbacks para cada métrica
      this.setupMetricCallback('CLS', getCLS);
      this.setupMetricCallback('FID', getFID);
      this.setupMetricCallback('FCP', getFCP);
      this.setupMetricCallback('LCP', getLCP);
      this.setupMetricCallback('TTFB', getTTFB);

      this.isInitialized = true;

      if (shouldDebug) {
        console.log('🚀 Web Vitals initialized in debug mode');
      }
    } catch (error) {
      console.warn('Failed to initialize Web Vitals:', error);
    }
  }

  /**
   * Verifica se deve habilitar debug
   */
  private shouldEnableDebug(): boolean {
    if (this.config.debug) {
      return true;
    }

    if (this.config.useLocalStorageDebug) {
      try {
        return localStorage.getItem('debug') === '1';
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Configura callback para uma métrica específica
   */
  private setupMetricCallback(
    name: string,
    getMetric: (callback: (metric: Metric) => void) => void
  ): void {
    getMetric(metric => {
      this.metrics.set(name, metric);

      // Callback personalizado
      if (this.config.onMetric) {
        this.config.onMetric(metric);
      }

      // Log no console se habilitado
      if (this.shouldEnableDebug() && this.config.consoleLog) {
        this.logMetric(metric);
      }

      // Envia para analytics se habilitado
      if (this.config.analytics) {
        this.sendToAnalytics(metric);
      }
    });
  }

  /**
   * Loga métrica no console
   */
  private logMetric(metric: Metric): void {
    const { name, value, delta, id, rating } = metric;

    console.log(`📊 ${name}:`, {
      value: `${value}ms`,
      delta: `${delta}ms`,
      rating: rating,
      id: id,
    });
  }

  /**
   * Envia métrica para analytics
   */
  private sendToAnalytics(metric: Metric): void {
    // Implementação básica - pode ser expandida para Google Analytics, etc.
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        metric_name: metric.name,
        metric_value: Math.round(metric.value),
        metric_delta: Math.round(metric.delta),
        metric_rating: metric.rating,
      });
    }
  }

  /**
   * Obtém todas as métricas coletadas
   */
  getMetrics(): VitalsData {
    const data: VitalsData = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Adiciona métricas disponíveis
    this.metrics.forEach((metric, name) => {
      switch (name) {
        case 'LCP':
          data.lcp = metric.value;
          break;
        case 'FID':
          data.fid = metric.value;
          break;
        case 'CLS':
          data.cls = metric.value;
          break;
        case 'FCP':
          data.fcp = metric.value;
          break;
        case 'TTFB':
          data.ttfb = metric.value;
          break;
      }
    });

    return data;
  }

  /**
   * Exibe métricas em formato de tabela no console
   */
  displayMetricsTable(): void {
    if (!this.shouldEnableDebug()) {
      return;
    }

    const metrics = this.getMetrics();
    const tableData = [];

    if (metrics.lcp !== undefined) {
      tableData.push({
        Metric: 'LCP (Largest Contentful Paint)',
        Value: `${metrics.lcp}ms`,
        Rating: this.getRating('LCP', metrics.lcp),
      });
    }
    if (metrics.fid !== undefined) {
      tableData.push({
        Metric: 'FID (First Input Delay)',
        Value: `${metrics.fid}ms`,
        Rating: this.getRating('FID', metrics.fid),
      });
    }
    if (metrics.cls !== undefined) {
      tableData.push({
        Metric: 'CLS (Cumulative Layout Shift)',
        Value: metrics.cls.toFixed(4),
        Rating: this.getRating('CLS', metrics.cls),
      });
    }
    if (metrics.fcp !== undefined) {
      tableData.push({
        Metric: 'FCP (First Contentful Paint)',
        Value: `${metrics.fcp}ms`,
        Rating: this.getRating('FCP', metrics.fcp),
      });
    }
    if (metrics.ttfb !== undefined) {
      tableData.push({
        Metric: 'TTFB (Time to First Byte)',
        Value: `${metrics.ttfb}ms`,
        Rating: this.getRating('TTFB', metrics.ttfb),
      });
    }

    if (tableData.length > 0) {
      console.table(tableData);
    }
  }

  /**
   * Obtém rating de uma métrica
   */
  private getRating(metricName: string, value: number): string {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metricName as keyof typeof thresholds];
    if (!threshold) return 'N/A';

    if (value <= threshold.good) return '🟢 Good';
    if (value <= threshold.poor) return '🟡 Needs Improvement';
    return '🔴 Poor';
  }

  /**
   * Adiciona marcador de performance
   */
  mark(name: string, detail?: any): void {
    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      detail,
    };

    this.marks.push(mark);
    performance.mark(name);

    if (this.shouldEnableDebug()) {
      console.log(`📍 Performance mark: ${name}`, detail);
    }
  }

  /**
   * Finaliza marcador de performance
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = performance.now();
    const duration = endMark
      ? performance.measure(name, startMark, endMark).duration
      : performance.measure(name, startMark).duration;

    // Atualiza marcador existente
    const markIndex = this.marks.findIndex(m => m.name === startMark);
    if (markIndex !== -1) {
      this.marks[markIndex].duration = duration;
    }

    if (this.shouldEnableDebug()) {
      console.log(`⏱️ Performance measure: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        startMark,
        endMark: endMark || 'now',
      });
    }

    return duration;
  }

  /**
   * Obtém todos os marcadores
   */
  getMarks(): PerformanceMark[] {
    return [...this.marks];
  }

  /**
   * Limpa marcadores
   */
  clearMarks(): void {
    this.marks = [];
    performance.clearMarks();
  }

  /**
   * Obtém informações de performance do navegador
   */
  getBrowserInfo(): any {
    if (!this.shouldEnableDebug()) {
      return null;
    }

    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      navigation: {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
      },
      paint: {
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(
          p => p.name === 'first-contentful-paint'
        )?.startTime,
      },
      memory: (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null,
    };
  }

  /**
   * Exibe relatório completo de performance
   */
  displayPerformanceReport(): void {
    if (!this.shouldEnableDebug()) {
      return;
    }

    console.group('🚀 Performance Report');

    // Web Vitals
    this.displayMetricsTable();

    // Browser Info
    const browserInfo = this.getBrowserInfo();
    if (browserInfo) {
      console.group('🌐 Browser Performance');
      console.table(browserInfo.navigation);
      if (browserInfo.paint) {
        console.table(browserInfo.paint);
      }
      if (browserInfo.memory) {
        console.table(browserInfo.memory);
      }
      console.groupEnd();
    }

    // Performance Marks
    if (this.marks.length > 0) {
      console.group('📍 Performance Marks');
      console.table(
        this.marks.map(mark => ({
          Name: mark.name,
          Duration: mark.duration ? `${mark.duration.toFixed(2)}ms` : 'N/A',
          StartTime: `${mark.startTime.toFixed(2)}ms`,
          Detail: mark.detail ? JSON.stringify(mark.detail) : 'N/A',
        }))
      );
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Instância global do manager
const vitalsManager = new VitalsManager();

// Funções de conveniência
export const initVitals = (config?: VitalsConfig) => vitalsManager.init();
export const getVitalsData = () => vitalsManager.getMetrics();
export const displayVitalsTable = () => vitalsManager.displayMetricsTable();
export const displayPerformanceReport = () =>
  vitalsManager.displayPerformanceReport();
export const markPerformance = (name: string, detail?: any) =>
  vitalsManager.mark(name, detail);
export const measurePerformance = (
  name: string,
  startMark: string,
  endMark?: string
) => vitalsManager.measure(name, startMark, endMark);
export const getPerformanceMarks = () => vitalsManager.getMarks();
export const clearPerformanceMarks = () => vitalsManager.clearMarks();
export const getBrowserInfo = () => vitalsManager.getBrowserInfo();

export default vitalsManager;

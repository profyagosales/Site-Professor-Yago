/**
 * Hook para gerenciar Web Vitals
 *
 * Funcionalidades:
 * - Inicialização automática do sistema de vitals
 * - Controle de debug via localStorage
 * - Métricas de performance em tempo real
 * - Marcadores de performance
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  initVitals,
  getVitalsData,
  displayVitalsTable,
  displayPerformanceReport,
  markPerformance,
  measurePerformance,
  getPerformanceMarks,
  clearPerformanceMarks,
  getBrowserInfo,
  type VitalsConfig,
} from '@/lib/vitals';
import { wrapInterval, count } from '@/lib/net-debug';

export interface UseVitalsOptions extends VitalsConfig {
  // Se deve inicializar automaticamente
  autoInit?: boolean;
  // Intervalo para exibir relatório (em ms)
  reportInterval?: number;
  // Se deve exibir relatório na inicialização
  showReportOnInit?: boolean;
}

export interface UseVitalsReturn {
  // Inicializa o sistema de vitals
  init: () => Promise<void>;
  // Obtém dados das métricas
  getMetrics: () => any;
  // Exibe tabela de métricas no console
  showMetricsTable: () => void;
  // Exibe relatório completo de performance
  showPerformanceReport: () => void;
  // Adiciona marcador de performance
  mark: (name: string, detail?: any) => void;
  // Mede performance entre marcadores
  measure: (name: string, startMark: string, endMark?: string) => number;
  // Obtém marcadores de performance
  getMarks: () => any[];
  // Limpa marcadores
  clearMarks: () => void;
  // Obtém informações do navegador
  getBrowserInfo: () => any;
  // Se está inicializado
  isInitialized: boolean;
}

export function useVitals(options: UseVitalsOptions = {}): UseVitalsReturn {
  const {
    autoInit = true,
    reportInterval,
    showReportOnInit = false,
    ...vitalsConfig
  } = options;

  const isInitializedRef = useRef(false);
  const reportIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializa o sistema de vitals
  const init = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    try {
      await initVitals(vitalsConfig);
      isInitializedRef.current = true;

      if (showReportOnInit) {
        // Aguarda um pouco para coletar métricas iniciais
        setTimeout(() => {
          displayPerformanceReport();
        }, 2000);
      }
    } catch (error) {
      console.warn('Failed to initialize Web Vitals:', error);
    }
  }, [vitalsConfig, showReportOnInit]);

  // Obtém dados das métricas
  const getMetrics = useCallback(() => {
    return getVitalsData();
  }, []);

  // Exibe tabela de métricas
  const showMetricsTable = useCallback(() => {
    displayVitalsTable();
  }, []);

  // Exibe relatório completo
  const showPerformanceReport = useCallback(() => {
    displayPerformanceReport();
  }, []);

  // Adiciona marcador de performance
  const mark = useCallback((name: string, detail?: any) => {
    markPerformance(name, detail);
  }, []);

  // Mede performance entre marcadores
  const measure = useCallback(
    (name: string, startMark: string, endMark?: string) => {
      return measurePerformance(name, startMark, endMark);
    },
    []
  );

  // Obtém marcadores
  const getMarks = useCallback(() => {
    return getPerformanceMarks();
  }, []);

  // Limpa marcadores
  const clearMarks = useCallback(() => {
    clearPerformanceMarks();
  }, []);

  // Obtém informações do navegador
  const getBrowserInfo = useCallback(() => {
    return getBrowserInfo();
  }, []);

  // Inicialização automática
  useEffect(() => {
    if (autoInit) {
      init();
    }
  }, [autoInit, init]);

  // Configura intervalo de relatório
  useEffect(() => {
    if (reportInterval && reportInterval > 0) {
      count('useVitals/report-interval');
      const clearReportInterval = wrapInterval(() => {
        if (isInitializedRef.current) {
          displayPerformanceReport();
        }
      }, reportInterval, 'useVitals/performance-report');

      reportIntervalRef.current = clearReportInterval;

      return () => {
        if (reportIntervalRef.current) {
          reportIntervalRef.current();
          reportIntervalRef.current = null;
        }
      };
    }
  }, [reportInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
    };
  }, []);

  return {
    init,
    getMetrics,
    showMetricsTable,
    showPerformanceReport,
    mark,
    measure,
    getMarks,
    clearMarks,
    getBrowserInfo,
    isInitialized: isInitializedRef.current,
  };
}

// Hook específico para debug
export function useVitalsDebug() {
  const vitals = useVitals({
    debug: true,
    consoleLog: true,
    showReportOnInit: true,
  });

  // Adiciona função para alternar debug
  const toggleDebug = useCallback(() => {
    try {
      const currentDebug = localStorage.getItem('debug');
      const newDebug = currentDebug === '1' ? '0' : '1';
      localStorage.setItem('debug', newDebug);

      if (newDebug === '1') {
        console.log('🐛 Debug mode enabled - Web Vitals will be logged');
        vitals.showPerformanceReport();
      } else {
        console.log('🔇 Debug mode disabled - Web Vitals will be silent');
      }
    } catch (error) {
      console.warn('Failed to toggle debug mode:', error);
    }
  }, [vitals]);

  return {
    ...vitals,
    toggleDebug,
  };
}

// Hook para marcadores de performance específicos
export function usePerformanceMarks() {
  const vitals = useVitals();

  // Marcadores comuns
  const markPageLoad = useCallback(() => {
    vitals.mark('page_load_start');
  }, [vitals]);

  const markPageLoadEnd = useCallback(() => {
    vitals.mark('page_load_end');
    vitals.measure('page_load_duration', 'page_load_start', 'page_load_end');
  }, [vitals]);

  const markApiCall = useCallback(
    (endpoint: string) => {
      vitals.mark(`api_call_start_${endpoint}`);
    },
    [vitals]
  );

  const markApiCallEnd = useCallback(
    (endpoint: string) => {
      vitals.mark(`api_call_end_${endpoint}`);
      vitals.measure(
        `api_call_duration_${endpoint}`,
        `api_call_start_${endpoint}`,
        `api_call_end_${endpoint}`
      );
    },
    [vitals]
  );

  const markComponentRender = useCallback(
    (componentName: string) => {
      vitals.mark(`component_render_start_${componentName}`);
    },
    [vitals]
  );

  const markComponentRenderEnd = useCallback(
    (componentName: string) => {
      vitals.mark(`component_render_end_${componentName}`);
      vitals.measure(
        `component_render_duration_${componentName}`,
        `component_render_start_${componentName}`,
        `component_render_end_${componentName}`
      );
    },
    [vitals]
  );

  return {
    ...vitals,
    markPageLoad,
    markPageLoadEnd,
    markApiCall,
    markApiCallEnd,
    markComponentRender,
    markComponentRenderEnd,
  };
}

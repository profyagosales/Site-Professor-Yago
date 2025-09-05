/**
 * Serviço de health-check do backend
 *
 * Características:
 * - Timeout de 2.5s para evitar travamentos
 * - Cache de resultado para evitar requisições excessivas
 * - Retry automático com backoff exponencial
 * - Logs detalhados para debugging
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { logger } from '@/lib/logger';

// Cache de health status para evitar requisições excessivas
let healthCache: {
  isHealthy: boolean;
  lastCheck: number;
  retryCount: number;
} = {
  isHealthy: true,
  lastCheck: 0,
  retryCount: 0,
};

// Configurações
const HEALTH_CHECK_INTERVAL = 30000; // 30 segundos
const CACHE_DURATION = 5000; // 5 segundos de cache
const MAX_RETRY_COUNT = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Backoff exponencial

/**
 * Verifica se o backend está saudável
 * @param forceRefresh - Força verificação mesmo com cache válido
 * @returns Promise<boolean> - true se saudável, false caso contrário
 */
export async function checkApiHealth(forceRefresh = false): Promise<boolean> {
  const now = Date.now();

  // Usar cache se ainda válido e não forçado
  if (!forceRefresh && now - healthCache.lastCheck < CACHE_DURATION) {
    return healthCache.isHealthy;
  }

  try {
    logger.info('Iniciando health check do backend', {
      component: 'health',
      action: 'check_start',
      retryCount: healthCache.retryCount,
    });

    // Fazer requisição HEAD com timeout de 2.5s
    const response = await api.get('/health', {
      timeout: 2500,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    const isHealthy = response.status >= 200 && response.status < 300;

    // Atualizar cache
    healthCache = {
      isHealthy,
      lastCheck: now,
      retryCount: isHealthy ? 0 : healthCache.retryCount + 1,
    };

    if (isHealthy) {
      logger.info('Backend está saudável', {
        component: 'health',
        action: 'check_success',
        status: response.status,
        responseTime: now - healthCache.lastCheck,
      });
    } else {
      logger.warn('Backend retornou status não saudável', {
        component: 'health',
        action: 'check_unhealthy',
        status: response.status,
        retryCount: healthCache.retryCount,
      });
    }

    return isHealthy;
  } catch (error: any) {
    const retryCount = healthCache.retryCount + 1;

    // Atualizar cache com erro
    healthCache = {
      isHealthy: false,
      lastCheck: now,
      retryCount,
    };

    // Log específico para diferentes tipos de erro
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      logger.warn('Health check timeout - backend pode estar lento', {
        component: 'health',
        action: 'check_timeout',
        retryCount,
        error: error.message,
      });
    } else if (
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error')
    ) {
      logger.warn('Health check falhou - sem conectividade com backend', {
        component: 'health',
        action: 'check_network_error',
        retryCount,
        error: error.message,
      });
    } else {
      logger.error('Health check falhou com erro inesperado', {
        component: 'health',
        action: 'check_error',
        retryCount,
        error: error.message,
        status: error.response?.status,
      });
    }

    return false;
  }
}

/**
 * Retry automático com backoff exponencial
 * @param maxRetries - Número máximo de tentativas
 * @returns Promise<boolean> - true se conseguiu conectar, false caso contrário
 */
export async function retryHealthCheck(
  maxRetries = MAX_RETRY_COUNT
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const isHealthy = await checkApiHealth(true);

    if (isHealthy) {
      logger.info('Health check recuperado após retry', {
        component: 'health',
        action: 'retry_success',
        attempt: attempt + 1,
        totalAttempts: maxRetries,
      });
      return true;
    }

    // Aguardar antes da próxima tentativa (backoff exponencial)
    if (attempt < maxRetries - 1) {
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      logger.info('Aguardando antes do próximo retry', {
        component: 'health',
        action: 'retry_wait',
        attempt: attempt + 1,
        delay,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logger.error('Health check falhou após todas as tentativas', {
    component: 'health',
    action: 'retry_failed',
    totalAttempts: maxRetries,
  });

  return false;
}

/**
 * Hook para monitorar saúde do backend
 * @param interval - Intervalo de verificação em ms (padrão: 30s)
 * @returns Objeto com status e funções de controle
 */
export function useBackendHealth(interval = HEALTH_CHECK_INTERVAL) {
  const [isHealthy, setIsHealthy] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = useCallback(
    async (force = false) => {
      if (isChecking && !force) return;

      setIsChecking(true);
      try {
        const healthy = await checkApiHealth(force);
        setIsHealthy(healthy);
        setLastCheck(new Date());
        setRetryCount(healthCache.retryCount);
      } finally {
        setIsChecking(false);
      }
    },
    [isChecking]
  );

  const retry = useCallback(async () => {
    setIsChecking(true);
    try {
      const healthy = await retryHealthCheck();
      setIsHealthy(healthy);
      setLastCheck(new Date());
      setRetryCount(healthCache.retryCount);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Verificação inicial
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Agendamento de verificações periódicas
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkHealth();
    }, interval);

    return () => clearInterval(intervalId);
  }, [checkHealth, interval]);

  return {
    isHealthy,
    isChecking,
    lastCheck,
    retryCount,
    checkHealth,
    retry,
  };
}

/**
 * Utilitário para verificar se uma ação deve ser bloqueada quando offline
 * @param action - Nome da ação para logging
 * @returns boolean - true se deve bloquear, false caso contrário
 */
export function shouldBlockAction(action: string): boolean {
  const isHealthy = healthCache.isHealthy;

  if (!isHealthy) {
    logger.warn('Ação bloqueada - backend indisponível', {
      component: 'health',
      action: 'block_action',
      blockedAction: action,
      retryCount: healthCache.retryCount,
    });
  }

  return !isHealthy;
}

/**
 * Força limpeza do cache de health
 */
export function clearHealthCache(): void {
  healthCache = {
    isHealthy: true,
    lastCheck: 0,
    retryCount: 0,
  };

  logger.info('Cache de health limpo', {
    component: 'health',
    action: 'clear_cache',
  });
}

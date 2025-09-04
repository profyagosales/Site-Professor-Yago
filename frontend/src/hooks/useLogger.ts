import { useCallback } from 'react';
import { logger, type LogContext } from '@/lib/logger';
import { useLocation } from 'react-router-dom';

/**
 * Hook para facilitar o uso do logger com contexto automático
 */
export function useLogger() {
  const location = useLocation();

  const logInfo = useCallback((message: string, context?: LogContext) => {
    logger.info(message, {
      ...context,
      route: location.pathname,
    });
  }, [location.pathname]);

  const logWarn = useCallback((message: string, context?: LogContext) => {
    logger.warn(message, {
      ...context,
      route: location.pathname,
    });
  }, [location.pathname]);

  const logError = useCallback((message: string, context?: LogContext, error?: Error) => {
    logger.error(message, {
      ...context,
      route: location.pathname,
    }, error);
  }, [location.pathname]);

  const logPerformance = useCallback((operation: string, duration: number, context?: LogContext) => {
    logger.performance(operation, duration, {
      ...context,
      route: location.pathname,
    });
  }, [location.pathname]);

  const logNavigation = useCallback((from: string, to: string, context?: LogContext) => {
    logger.navigation(from, to, {
      ...context,
      route: to,
    });
  }, []);

  const logAuth = useCallback((action: string, success: boolean, context?: LogContext) => {
    logger.auth(action, success, {
      ...context,
      route: location.pathname,
    });
  }, [location.pathname]);

  const logAuthError = useCallback((action: string, error: Error, context?: LogContext) => {
    logger.authError(action, error, {
      ...context,
      route: location.pathname,
    });
  }, [location.pathname]);

  return {
    info: logInfo,
    warn: logWarn,
    error: logError,
    performance: logPerformance,
    navigation: logNavigation,
    auth: logAuth,
    authError: logAuthError,
    // Acesso direto ao logger para casos especiais
    logger,
  };
}

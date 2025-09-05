/**
 * Sistema de logging minimalista com gate de ambiente
 * - Silencioso em PROD por padrão
 * - Ativado em DEV ou com localStorage.debug='1'
 * - Integração opcional com Sentry sem acoplamento
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  route?: string;
  user?: string;
  action?: string;
  component?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

class Logger {
  private isEnabled: boolean;
  private sentryAvailable: boolean;

  constructor() {
    // Ativar logging em DEV ou se localStorage.debug='1'
    // Compatível com Jest (teste de ambiente)
    const isDev =
      typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
    const isTest = process.env.NODE_ENV === 'test';
    this.isEnabled =
      isDev ||
      (!isTest &&
        typeof window !== 'undefined' &&
        localStorage.getItem('debug') === '1');

    // Verificar se Sentry está disponível (sem importar)
    this.sentryAvailable =
      typeof window !== 'undefined' &&
      typeof (window as any).__SENTRY__?.captureException === 'function';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isEnabled;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private logToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage, error);
        break;
    }
  }

  private logToSentry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (!this.sentryAvailable || level !== 'error') return;

    try {
      const sentry = (window as any).__SENTRY__;
      if (error) {
        sentry.captureException(error, {
          tags: {
            level,
            component: context?.component,
            route: context?.route,
          },
          extra: {
            message,
            context,
          },
        });
      } else {
        sentry.captureMessage(message, {
          level: 'error',
          tags: {
            component: context?.component,
            route: context?.route,
          },
          extra: {
            context,
          },
        });
      }
    } catch (e) {
      // Falha silenciosa se Sentry não estiver disponível
      console.warn('Failed to log to Sentry:', e);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };
  }

  /**
   * Log de informação geral
   */
  info(message: string, context?: LogContext): void {
    this.logToConsole('info', message, context);
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext): void {
    this.logToConsole('warn', message, context);
  }

  /**
   * Log de erro
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.logToConsole('error', message, context, error);
    this.logToSentry('error', message, context, error);
  }

  /**
   * Log de erro com captura automática de stack trace
   */
  errorWithStack(message: string, context?: LogContext): void {
    const error = new Error(message);
    this.error(message, context, error);
  }

  /**
   * Log de performance (duração de operações)
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      action: 'performance',
      duration,
    });
  }

  /**
   * Log de navegação
   */
  navigation(from: string, to: string, context?: LogContext): void {
    this.info(`Navigation: ${from} → ${to}`, {
      ...context,
      action: 'navigation',
      route: to,
    });
  }

  /**
   * Log de API (usado pelos interceptores)
   */
  api(
    method: string,
    url: string,
    status: number,
    duration: number,
    payloadSize?: number
  ): void {
    this.info(`API: ${method} ${url}`, {
      action: 'api',
      method,
      url,
      status,
      duration,
      payloadSize,
    });
  }

  /**
   * Log de erro de API
   */
  apiError(method: string, url: string, error: Error, duration?: number): void {
    this.error(
      `API Error: ${method} ${url}`,
      {
        action: 'api',
        method,
        url,
        duration,
      },
      error
    );
  }

  /**
   * Log de autenticação
   */
  auth(action: string, success: boolean, context?: LogContext): void {
    const level = success ? 'info' : 'warn';
    this[level](`Auth: ${action} ${success ? 'successful' : 'failed'}`, {
      ...context,
      action: 'auth',
    });
  }

  /**
   * Log de erro de autenticação
   */
  authError(action: string, error: Error, context?: LogContext): void {
    this.error(
      `Auth Error: ${action}`,
      {
        ...context,
        action: 'auth',
      },
      error
    );
  }

  /**
   * Habilitar/desabilitar logging dinamicamente
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Verificar se logging está habilitado
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Obter logs recentes (para debug)
   */
  getRecentLogs(limit: number = 50): LogEntry[] {
    // Implementação simples em memória
    // Em produção, isso poderia ser conectado a um sistema de logging
    return [];
  }
}

// Instância singleton
export const logger = new Logger();

// Exportar tipos para uso externo
export type { LogLevel, LogContext, LogEntry };

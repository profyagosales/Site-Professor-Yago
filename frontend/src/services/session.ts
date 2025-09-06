/**
 * Serviço de gerenciamento de sessão
 *
 * Centraliza toda a lógica de sessão: TTL, idle logout, sincronização entre abas
 */

import {
  SESSION_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  ROLE_STORAGE_KEY,
  SESSION_TTL,
  IDLE_TIMEOUT,
  LOGOUT_MESSAGES,
  type SessionData,
} from '@/config/auth';
import { logger } from '@/lib/logger';

// Callbacks para notificar mudanças de sessão
type SessionCallbacks = {
  onLogout: (reason: keyof typeof LOGOUT_MESSAGES) => void;
  onSessionExpired: () => void;
  onIdleTimeout: () => void;
};

let sessionCallbacks: SessionCallbacks | null = null;

/**
 * Registra callbacks para eventos de sessão
 */
export function setSessionCallbacks(callbacks: SessionCallbacks) {
  sessionCallbacks = callbacks;
}

/**
 * Obtém dados da sessão do localStorage
 */
export function getSessionData(): SessionData | null {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const sessionData = JSON.parse(data) as SessionData;

    // Valida estrutura básica
    if (!sessionData.token || !sessionData.role || !sessionData.issuedAt) {
      logger.warn('Invalid session data structure', {
        component: 'session',
        action: 'getSessionData',
        data: sessionData,
      });
      return null;
    }

    return sessionData;
  } catch (error) {
    logger.error('Failed to parse session data', {
      component: 'session',
      action: 'getSessionData',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Salva dados da sessão no localStorage
 */
export function saveSessionData(sessionData: SessionData): void {
  try {
    const data = JSON.stringify(sessionData);
    localStorage.setItem(SESSION_STORAGE_KEY, data);

    // Mantém compatibilidade com sistema antigo
    localStorage.setItem(TOKEN_STORAGE_KEY, sessionData.token);
    localStorage.setItem(ROLE_STORAGE_KEY, sessionData.role);

    logger.info('Session data saved', {
      component: 'session',
      action: 'saveSessionData',
      role: sessionData.role,
      issuedAt: new Date(sessionData.issuedAt).toISOString(),
    });
  } catch (error) {
    logger.error('Failed to save session data', {
      component: 'session',
      action: 'saveSessionData',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Limpa todos os dados de sessão
 */
export function clearSessionData(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);

    logger.info('Session data cleared', {
      component: 'session',
      action: 'clearSessionData',
    });
  } catch (error) {
    logger.error('Failed to clear session data', {
      component: 'session',
      action: 'clearSessionData',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Verifica se a sessão está expirada por TTL
 */
export function isSessionExpired(sessionData?: SessionData): boolean {
  const data = sessionData || getSessionData();
  if (!data) return true;

  const now = Date.now();
  const sessionAge = now - data.issuedAt;

  return sessionAge >= SESSION_TTL;
}

/**
 * Verifica se a sessão está expirada por inatividade
 */
export function isSessionIdle(sessionData?: SessionData): boolean {
  const data = sessionData || getSessionData();
  if (!data) return true;

  const now = Date.now();
  const idleTime = now - data.lastActivity;

  return idleTime >= IDLE_TIMEOUT;
}

/**
 * Atualiza o timestamp da última atividade
 */
export function updateLastActivity(): void {
  const sessionData = getSessionData();
  if (!sessionData) return;

  const updatedData: SessionData = {
    ...sessionData,
    lastActivity: Date.now(),
  };

  saveSessionData(updatedData);
}

/**
 * Cria uma nova sessão
 */
export function createSession(
  token: string,
  role: 'professor' | 'aluno'
): void {
  const now = Date.now();
  const sessionData: SessionData = {
    token,
    role,
    issuedAt: now,
    lastActivity: now,
  };

  saveSessionData(sessionData);

  logger.info('New session created', {
    component: 'session',
    action: 'createSession',
    role,
    issuedAt: new Date(now).toISOString(),
  });
}

/**
 * Valida a sessão atual
 */
export function validateSession(): { isValid: boolean; reason?: string } {
  const sessionData = getSessionData();

  if (!sessionData) {
    return { isValid: false, reason: 'No session data' };
  }

  if (isSessionExpired(sessionData)) {
    return { isValid: false, reason: 'Session expired by TTL' };
  }

  if (isSessionIdle(sessionData)) {
    return { isValid: false, reason: 'Session expired by inactivity' };
  }

  return { isValid: true };
}

/**
 * Executa logout com motivo específico
 */
export function performLogout(
  reason: keyof typeof LOGOUT_MESSAGES = 'MANUAL'
): void {
  logger.info('Performing logout', {
    component: 'session',
    action: 'performLogout',
    reason,
  });

  // Limpa dados da sessão
  clearSessionData();

  // Notifica callbacks
  if (sessionCallbacks) {
    sessionCallbacks.onLogout(reason);
  }

  // Redireciona para login apropriado
  // Navegação controlada deve ser feita externamente
}

/**
 * Inicializa o sistema de sessão
 */
export function initializeSession(): void {
  const validation = validateSession();

  if (!validation.isValid) {
    logger.warn('Invalid session on initialization', {
      component: 'session',
      action: 'initializeSession',
      reason: validation.reason,
    });

    performLogout('EXPIRED');
    return;
  }

  // Atualiza última atividade
  updateLastActivity();

  logger.info('Session initialized successfully', {
    component: 'session',
    action: 'initializeSession',
  });
}

/**
 * Obtém o token da sessão atual
 */
export function getSessionToken(): string | null {
  const sessionData = getSessionData();
  return sessionData?.token || null;
}

/**
 * Obtém a role da sessão atual
 */
export function getSessionRole(): 'professor' | 'aluno' | null {
  const sessionData = getSessionData();
  return sessionData?.role || null;
}

/**
 * Verifica se há uma sessão ativa
 */
export function hasActiveSession(): boolean {
  return validateSession().isValid;
}

/**
 * Obtém informações da sessão para debug
 */
export function getSessionInfo(): {
  hasSession: boolean;
  isValid: boolean;
  role: string | null;
  issuedAt: string | null;
  lastActivity: string | null;
  timeUntilExpiry: number | null;
  timeUntilIdle: number | null;
} {
  const sessionData = getSessionData();
  const validation = validateSession();

  if (!sessionData) {
    return {
      hasSession: false,
      isValid: false,
      role: null,
      issuedAt: null,
      lastActivity: null,
      timeUntilExpiry: null,
      timeUntilIdle: null,
    };
  }

  const now = Date.now();
  const timeUntilExpiry = Math.max(
    0,
    SESSION_TTL - (now - sessionData.issuedAt)
  );
  const timeUntilIdle = Math.max(
    0,
    IDLE_TIMEOUT - (now - sessionData.lastActivity)
  );

  return {
    hasSession: true,
    isValid: validation.isValid,
    role: sessionData.role,
    issuedAt: new Date(sessionData.issuedAt).toISOString(),
    lastActivity: new Date(sessionData.lastActivity).toISOString(),
    timeUntilExpiry,
    timeUntilIdle,
  };
}

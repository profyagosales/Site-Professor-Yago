/**
 * Testes básicos para o sistema de sessão
 * 
 * Cobre funcionalidades essenciais sem mocks complexos
 */

// Mock do logger antes de importar os serviços
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { 
  createSession, 
  getSessionData, 
  validateSession, 
  clearSessionData,
  getSessionInfo
} from '@/services/session';
import { SESSION_TTL, IDLE_TIMEOUT } from '@/config/auth';

describe('Sistema de Sessão', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpa localStorage antes de cada teste
    localStorage.clear();
  });

  describe('Criação de Sessão', () => {
    it('deve criar uma sessão válida', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      // Verifica se os dados foram salvos no localStorage
      expect(localStorage.getItem('auth_session')).toBeTruthy();
      expect(localStorage.getItem('auth_token')).toBe(token);
      expect(localStorage.getItem('auth_role')).toBe(role);
    });

    it('deve obter dados da sessão criada', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const sessionData = getSessionData();
      expect(sessionData).toBeTruthy();
      expect(sessionData?.token).toBe(token);
      expect(sessionData?.role).toBe(role);
      expect(sessionData?.issuedAt).toBeGreaterThan(0);
      expect(sessionData?.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('Validação de Sessão', () => {
    it('deve validar sessão recém-criada', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const validation = validateSession();
      expect(validation.isValid).toBe(true);
    });

    it('deve detectar sessão expirada por TTL', () => {
      const token = 'test-token-123';
      const role = 'professor';
      const oldTime = Date.now() - SESSION_TTL - 1000; // 1 segundo após expiração

      // Cria sessão expirada diretamente no localStorage
      const expiredSession = {
        token,
        role,
        issuedAt: oldTime,
        lastActivity: oldTime,
      };

      localStorage.setItem('auth_session', JSON.stringify(expiredSession));

      const validation = validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired by TTL');
    });

    it('deve detectar sessão expirada por inatividade', () => {
      const token = 'test-token-123';
      const role = 'professor';
      const now = Date.now();
      const oldActivity = now - IDLE_TIMEOUT - 1000; // 1 segundo após idle timeout

      // Cria sessão com atividade antiga
      const idleSession = {
        token,
        role,
        issuedAt: now - 1000, // Sessão recente
        lastActivity: oldActivity, // Atividade antiga
      };

      localStorage.setItem('auth_session', JSON.stringify(idleSession));

      const validation = validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired by inactivity');
    });
  });

  describe('Limpeza de Sessão', () => {
    it('deve limpar todos os dados de sessão', () => {
      // Cria uma sessão primeiro
      createSession('test-token', 'professor');
      
      // Limpa a sessão
      clearSessionData();

      expect(localStorage.getItem('auth_session')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_role')).toBeNull();
    });
  });

  describe('Informações de Sessão', () => {
    it('deve retornar informações corretas da sessão', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const info = getSessionInfo();

      expect(info.hasSession).toBe(true);
      expect(info.isValid).toBe(true);
      expect(info.role).toBe(role);
      expect(info.issuedAt).toBeTruthy();
      expect(info.lastActivity).toBeTruthy();
      expect(info.timeUntilExpiry).toBeGreaterThan(0);
      expect(info.timeUntilIdle).toBeGreaterThan(0);
    });

    it('deve retornar informações vazias quando não há sessão', () => {
      const info = getSessionInfo();

      expect(info.hasSession).toBe(false);
      expect(info.isValid).toBe(false);
      expect(info.role).toBe(null);
      expect(info.issuedAt).toBe(null);
      expect(info.lastActivity).toBe(null);
      expect(info.timeUntilExpiry).toBe(null);
      expect(info.timeUntilIdle).toBe(null);
    });
  });
});
 * 
 * Cobre funcionalidades essenciais sem mocks complexos
 */

// Mock do logger antes de importar os serviços
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { 
  createSession, 
  getSessionData, 
  validateSession, 
  clearSessionData,
  getSessionInfo
} from '@/services/session';
import { SESSION_TTL, IDLE_TIMEOUT } from '@/config/auth';

describe('Sistema de Sessão', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpa localStorage antes de cada teste
    localStorage.clear();
  });

  describe('Criação de Sessão', () => {
    it('deve criar uma sessão válida', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      // Verifica se os dados foram salvos no localStorage
      expect(localStorage.getItem('auth_session')).toBeTruthy();
      expect(localStorage.getItem('auth_token')).toBe(token);
      expect(localStorage.getItem('auth_role')).toBe(role);
    });

    it('deve obter dados da sessão criada', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const sessionData = getSessionData();
      expect(sessionData).toBeTruthy();
      expect(sessionData?.token).toBe(token);
      expect(sessionData?.role).toBe(role);
      expect(sessionData?.issuedAt).toBeGreaterThan(0);
      expect(sessionData?.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('Validação de Sessão', () => {
    it('deve validar sessão recém-criada', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const validation = validateSession();
      expect(validation.isValid).toBe(true);
    });

    it('deve detectar sessão expirada por TTL', () => {
      const token = 'test-token-123';
      const role = 'professor';
      const oldTime = Date.now() - SESSION_TTL - 1000; // 1 segundo após expiração

      // Cria sessão expirada diretamente no localStorage
      const expiredSession = {
        token,
        role,
        issuedAt: oldTime,
        lastActivity: oldTime,
      };

      localStorage.setItem('auth_session', JSON.stringify(expiredSession));

      const validation = validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired by TTL');
    });

    it('deve detectar sessão expirada por inatividade', () => {
      const token = 'test-token-123';
      const role = 'professor';
      const now = Date.now();
      const oldActivity = now - IDLE_TIMEOUT - 1000; // 1 segundo após idle timeout

      // Cria sessão com atividade antiga
      const idleSession = {
        token,
        role,
        issuedAt: now - 1000, // Sessão recente
        lastActivity: oldActivity, // Atividade antiga
      };

      localStorage.setItem('auth_session', JSON.stringify(idleSession));

      const validation = validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired by inactivity');
    });
  });

  describe('Limpeza de Sessão', () => {
    it('deve limpar todos os dados de sessão', () => {
      // Cria uma sessão primeiro
      createSession('test-token', 'professor');
      
      // Limpa a sessão
      clearSessionData();

      expect(localStorage.getItem('auth_session')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_role')).toBeNull();
    });
  });

  describe('Informações de Sessão', () => {
    it('deve retornar informações corretas da sessão', () => {
      const token = 'test-token-123';
      const role = 'professor';

      createSession(token, role);

      const info = getSessionInfo();

      expect(info.hasSession).toBe(true);
      expect(info.isValid).toBe(true);
      expect(info.role).toBe(role);
      expect(info.issuedAt).toBeTruthy();
      expect(info.lastActivity).toBeTruthy();
      expect(info.timeUntilExpiry).toBeGreaterThan(0);
      expect(info.timeUntilIdle).toBeGreaterThan(0);
    });

    it('deve retornar informações vazias quando não há sessão', () => {
      const info = getSessionInfo();

      expect(info.hasSession).toBe(false);
      expect(info.isValid).toBe(false);
      expect(info.role).toBe(null);
      expect(info.issuedAt).toBe(null);
      expect(info.lastActivity).toBe(null);
      expect(info.timeUntilExpiry).toBe(null);
      expect(info.timeUntilIdle).toBe(null);
    });
  });
});
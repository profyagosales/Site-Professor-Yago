/**
 * Configuração de autenticação e sessão
 *
 * Define TTLs, timeouts e configurações relacionadas à sessão do usuário
 */

// TTL da sessão (4 horas por padrão)
export const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 horas em ms

// Timeout de inatividade (45 minutos por padrão)
export const IDLE_TIMEOUT = 45 * 60 * 1000; // 45 minutos em ms

// Chave do localStorage para dados de sessão
export const SESSION_STORAGE_KEY = 'auth_session';

// Chave do localStorage para token (mantida para compatibilidade)
export const TOKEN_STORAGE_KEY = 'auth_token';

// Chave do localStorage para role
export const ROLE_STORAGE_KEY = 'auth_role';

// Estrutura dos dados de sessão
export interface SessionData {
  token: string;
  role: 'professor' | 'aluno';
  issuedAt: number; // timestamp de quando a sessão foi criada
  lastActivity: number; // timestamp da última atividade
}

// Configurações de toast para diferentes cenários de logout
export const LOGOUT_MESSAGES = {
  IDLE: 'Sessão encerrada por inatividade',
  EXPIRED: 'Sessão expirada. Faça login novamente.',
  UNAUTHORIZED: 'Sessão inválida. Faça login novamente.',
  MANUAL: 'Logout realizado com sucesso',
} as const;

// Configurações de redirecionamento por role
export const LOGIN_ROUTES = {
  professor: '/login-professor',
  aluno: '/login-aluno',
} as const;

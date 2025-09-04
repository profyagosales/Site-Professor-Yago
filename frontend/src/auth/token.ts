import { toast } from 'react-toastify';
import { ROUTES } from '@/routes';

export const STORAGE_TOKEN_KEY = "auth_token";

// Timer para auto-logout
let autoLogoutTimer: NodeJS.Timeout | null = null;

/**
 * Decodifica JWT sem bibliotecas externas
 * Retorna o payload decodificado ou null se inválido
 */
function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    // Adiciona padding se necessário
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Erro ao decodificar JWT:', error);
    return null;
  }
}

/**
 * Extrai a data de expiração do token JWT
 * Retorna timestamp em milissegundos ou null se inválido
 */
export function getExp(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  
  // JWT exp está em segundos, convertemos para milissegundos
  return payload.exp * 1000;
}

/**
 * Verifica se o token está expirado
 */
export function isTokenExpired(token: string): boolean {
  const exp = getExp(token);
  if (!exp) return true;
  
  // Considera expirado se faltam menos de 1 minuto
  return Date.now() >= (exp - 60000);
}

/**
 * Obtém o token do localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

/**
 * Salva o token no localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
}

/**
 * Remove o token do localStorage
 */
export function clearToken(): void {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
}

/**
 * Cancela o timer de auto-logout
 */
function cancelAutoLogout(): void {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }
}

/**
 * Agenda o auto-logout para 1 minuto antes da expiração
 */
export function scheduleAutoLogout(token: string): void {
  // Cancela timer anterior se existir
  cancelAutoLogout();
  
  const exp = getExp(token);
  if (!exp) {
    console.warn('Token sem expiração válida, não agendando auto-logout');
    return;
  }
  
  // Agenda para 1 minuto antes da expiração
  const logoutTime = exp - 60000;
  const now = Date.now();
  
  if (logoutTime <= now) {
    // Token já expirado ou vai expirar em menos de 1 minuto
    console.warn('Token próximo da expiração, fazendo logout imediato');
    performAutoLogout();
    return;
  }
  
  const delay = logoutTime - now;
  console.log(`Auto-logout agendado para ${new Date(logoutTime).toLocaleString()}`);
  
  autoLogoutTimer = setTimeout(() => {
    performAutoLogout();
  }, delay);
}

/**
 * Executa o logout automático
 */
function performAutoLogout(): void {
  console.log('Executando auto-logout por expiração do token');
  
  // Limpa token
  clearToken();
  
  // Mostra toast informativo
  toast.info('Sessão expirada. Faça login novamente.', {
    autoClose: 5000,
    position: 'top-right'
  });
  
  // Redireciona conforme contexto
  const currentPath = window.location.pathname;
  let redirectPath = ROUTES.home;
  
  if (currentPath.startsWith('/aluno')) {
    redirectPath = ROUTES.auth.loginAluno;
  } else if (currentPath.startsWith('/professor')) {
    redirectPath = ROUTES.auth.loginProf;
  }
  
  // Usa replace para evitar voltar à página anterior
  window.location.replace(redirectPath);
}

/**
 * Inicializa o gerenciamento de sessão com o token
 */
export function initializeSession(token: string): void {
  if (isTokenExpired(token)) {
    console.warn('Token já expirado, limpando sessão');
    clearToken();
    return;
  }
  
  setToken(token);
  scheduleAutoLogout(token);
}

/**
 * Limpa a sessão e cancela timers
 */
export function clearSession(): void {
  cancelAutoLogout();
  clearToken();
}

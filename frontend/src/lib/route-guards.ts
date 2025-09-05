/**
 * Route Guards - Sistema de Guardas de Rota
 * 
 * Este módulo implementa guardas de rota para evitar loops de navegação
 * e redirecionamentos desnecessários em rotas públicas.
 * 
 * Características:
 * - Lista explícita de rotas públicas
 * - Prevenção de navigate em rotas públicas
 * - Validação de token antes de chamar /auth/me
 * - Guardas inteligentes para diferentes tipos de usuário
 * - Logging para debugging
 */

import { ROUTES } from '@/routes';

// Lista explícita de rotas públicas (não requerem autenticação)
export const PUBLIC_ROUTES = [
  ROUTES.home,                    // '/'
  ROUTES.auth.loginProf,          // '/login-professor'
  ROUTES.auth.loginAluno,         // '/login-aluno'
  '/login-professor',             // Compatibilidade com rotas antigas
  '/login-aluno',                 // Compatibilidade com rotas antigas
  '/professor/login',             // Redirecionamento
  '/aluno/login',                 // Redirecionamento
] as const;

// Lista de rotas privadas (requerem autenticação)
export const PRIVATE_ROUTES = {
  professor: [
    ROUTES.prof.base,             // '/professor'
    ROUTES.prof.resumo,           // '/professor/resumo'
    ROUTES.prof.turmas,           // '/professor/turmas'
    ROUTES.prof.notasClasse,      // '/professor/notas-da-classe'
    ROUTES.prof.caderno,          // '/professor/caderno'
    ROUTES.prof.gabarito,         // '/professor/gabarito'
    ROUTES.prof.redacao,          // '/professor/redacao'
    ROUTES.prof.alunos,           // '/professor/alunos'
    ROUTES.prof.avisos,           // '/professor/avisos'
  ],
  aluno: [
    ROUTES.aluno.base,            // '/aluno'
    ROUTES.aluno.resumo,          // '/aluno/resumo'
    ROUTES.aluno.notas,           // '/aluno/notas'
    ROUTES.aluno.recados,         // '/aluno/recados'
    ROUTES.aluno.gabaritos,       // '/aluno/gabaritos'
    ROUTES.aluno.redacao,         // '/aluno/redacao'
    ROUTES.aluno.caderno,         // '/aluno/caderno'
    ROUTES.aluno.redacoes,        // '/aluno/redacoes'
  ],
} as const;

// Configurações
const GUARD_CONFIG = {
  enableLogging: import.meta.env.DEV || localStorage.getItem('debug') === '1',
  skipAuthMeWithoutToken: true,
  preventPublicRouteRedirects: true,
};

/**
 * Log de debug para guardas de rota
 */
function log(message: string, ...args: any[]) {
  if (GUARD_CONFIG.enableLogging) {
    console.info(`[RouteGuard] ${message}`, ...args);
  }
}

/**
 * Verifica se uma rota é pública
 */
export function isPublicRoute(pathname: string): boolean {
  // Verificar exata match
  if (PUBLIC_ROUTES.includes(pathname as any)) {
    return true;
  }

  // Verificar se começa com rota pública (para subrotas)
  const isPublic = PUBLIC_ROUTES.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  log(`Verificando rota pública: ${pathname} -> ${isPublic}`);
  return isPublic;
}

/**
 * Verifica se uma rota é privada para professor
 */
export function isProfessorRoute(pathname: string): boolean {
  const isProf = pathname.startsWith('/professor');
  log(`Verificando rota de professor: ${pathname} -> ${isProf}`);
  return isProf;
}

/**
 * Verifica se uma rota é privada para aluno
 */
export function isStudentRoute(pathname: string): boolean {
  const isStudent = pathname.startsWith('/aluno');
  log(`Verificando rota de aluno: ${pathname} -> ${isStudent}`);
  return isStudent;
}

/**
 * Obtém o tipo de usuário baseado na rota
 */
export function getUserTypeFromRoute(pathname: string): 'professor' | 'aluno' | null {
  if (isProfessorRoute(pathname)) {
    return 'professor';
  }
  if (isStudentRoute(pathname)) {
    return 'aluno';
  }
  return null;
}

/**
 * Obtém a rota de login apropriada baseada no tipo de usuário
 */
export function getLoginRoute(userType: 'professor' | 'aluno'): string {
  return userType === 'aluno' ? ROUTES.auth.loginAluno : ROUTES.auth.loginProf;
}

/**
 * Verifica se deve chamar /auth/me baseado na presença do token
 */
export function shouldCallAuthMe(token: string | null): boolean {
  if (!GUARD_CONFIG.skipAuthMeWithoutToken) {
    return true; // Comportamento antigo
  }

  const shouldCall = !!token;
  log(`Deve chamar /auth/me: ${shouldCall} (token: ${!!token})`);
  return shouldCall;
}

/**
 * Verifica se deve redirecionar baseado na rota e token
 */
export function shouldRedirectToLogin(
  pathname: string,
  token: string | null,
  userType?: 'professor' | 'aluno'
): { shouldRedirect: boolean; loginRoute?: string } {
  // Se é rota pública, nunca redirecionar
  if (isPublicRoute(pathname)) {
    log(`Rota pública ${pathname} - não redirecionar`);
    return { shouldRedirect: false };
  }

  // Se não tem token, redirecionar para login apropriado
  if (!token) {
    const detectedUserType = userType || getUserTypeFromRoute(pathname);
    if (detectedUserType) {
      const loginRoute = getLoginRoute(detectedUserType);
      log(`Sem token em rota privada ${pathname} - redirecionar para ${loginRoute}`);
      return { shouldRedirect: true, loginRoute };
    }
  }

  log(`Rota ${pathname} com token - não redirecionar`);
  return { shouldRedirect: false };
}

/**
 * Verifica se deve fazer navigate baseado na rota
 */
export function shouldNavigate(
  pathname: string,
  token: string | null,
  userType?: 'professor' | 'aluno'
): { shouldNavigate: boolean; targetRoute?: string } {
  // Se é rota pública, nunca fazer navigate
  if (isPublicRoute(pathname)) {
    log(`Rota pública ${pathname} - não fazer navigate`);
    return { shouldNavigate: false };
  }

  // Se não tem token, fazer navigate para login
  if (!token) {
    const detectedUserType = userType || getUserTypeFromRoute(pathname);
    if (detectedUserType) {
      const loginRoute = getLoginRoute(detectedUserType);
      log(`Sem token em rota privada ${pathname} - navigate para ${loginRoute}`);
      return { shouldNavigate: true, targetRoute: loginRoute };
    }
  }

  log(`Rota ${pathname} com token - não fazer navigate`);
  return { shouldNavigate: false };
}

/**
 * Valida se uma rota é acessível para o tipo de usuário
 */
export function isRouteAccessibleForUser(
  pathname: string,
  userType: 'professor' | 'aluno' | null
): boolean {
  if (!userType) {
    return isPublicRoute(pathname);
  }

  if (userType === 'professor') {
    return isPublicRoute(pathname) || isProfessorRoute(pathname);
  }

  if (userType === 'aluno') {
    return isPublicRoute(pathname) || isStudentRoute(pathname);
  }

  return false;
}

/**
 * Obtém informações de debug sobre uma rota
 */
export function getRouteDebugInfo(pathname: string, token: string | null, userType?: 'professor' | 'aluno') {
  const detectedUserType = userType || getUserTypeFromRoute(pathname);
  const shouldCall = shouldCallAuthMe(token);
  const redirectInfo = shouldRedirectToLogin(pathname, token, userType);
  const navigateInfo = shouldNavigate(pathname, token, userType);
  const isAccessible = isRouteAccessibleForUser(pathname, detectedUserType || null);

  return {
    pathname,
    token: !!token,
    userType: detectedUserType,
    isPublic: isPublicRoute(pathname),
    isProfessorRoute: isProfessorRoute(pathname),
    isStudentRoute: isStudentRoute(pathname),
    shouldCallAuthMe: shouldCall,
    shouldRedirect: redirectInfo.shouldRedirect,
    redirectRoute: redirectInfo.loginRoute,
    shouldNavigate: navigateInfo.shouldNavigate,
    navigateRoute: navigateInfo.targetRoute,
    isAccessible,
  };
}

/**
 * Hook para debug de rotas (apenas em desenvolvimento)
 */
export function useRouteDebug(pathname: string, token: string | null, userType?: 'professor' | 'aluno') {
  if (!GUARD_CONFIG.enableLogging) {
    return null;
  }

  const debugInfo = getRouteDebugInfo(pathname, token, userType);
  log('Debug de rota:', debugInfo);
  return debugInfo;
}

// Constantes já exportadas individualmente acima

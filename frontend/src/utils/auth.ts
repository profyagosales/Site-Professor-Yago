import { ROUTES } from '@/routes';

export function getToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function ensureAuthOrRedirect(
  navigate: (to: string, opts?: any) => void
): void {
  if (!isAuthenticated()) {
    navigate(ROUTES.auth.loginProf, { replace: true });
  }
}

export default { getToken, isAuthenticated, ensureAuthOrRedirect };

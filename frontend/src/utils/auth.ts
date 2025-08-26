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

export function ensureAuthOrRedirect(): void {
  if (!isAuthenticated()) {
    window.location.replace('/login-professor');
  }
}

export default { getToken, isAuthenticated, ensureAuthOrRedirect };

export function getToken(): null {
  return null;
}

export function isAuthenticated(): boolean {
  return false;
}

export function ensureAuthOrRedirect(): void {
  /* auth handled via AuthContext + cookies */
}

export default { getToken, isAuthenticated, ensureAuthOrRedirect };

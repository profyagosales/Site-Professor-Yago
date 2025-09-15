// Constantes relacionadas ao lock persistente de redirecionamento de auth
// Evita loops de recarregamento / redirecionamentos sucessivos para /auth-error

export const AUTH_REDIRECT_LOCK_KEY = 'auth_redirect_lock_ts';
// Tempo mínimo (ms) antes de permitir novo redirect automático para /auth-error
// Permite sobrescrever via variável de ambiente VITE_AUTH_REDIRECT_COOLDOWN (ms)
export const AUTH_REDIRECT_LOCK_COOLDOWN = (() => {
  const raw = (import.meta as any).env?.VITE_AUTH_REDIRECT_COOLDOWN;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!isNaN(parsed) && parsed > 0 && parsed < 5 * 60 * 1000) { // limite 5 minutos
    return parsed;
  }
  return 15000; // default 15s
})();

export function getAuthRedirectCooldown(): number {
  return AUTH_REDIRECT_LOCK_COOLDOWN;
}

export function isAuthRedirectLocked(now: number = Date.now()): boolean {
  try {
    const stored = localStorage.getItem(AUTH_REDIRECT_LOCK_KEY);
    if (!stored) return false;
    const ts = parseInt(stored, 10);
    if (isNaN(ts)) return false;
    return now - ts < AUTH_REDIRECT_LOCK_COOLDOWN;
  } catch {
    return false;
  }
}

export function authRedirectRemaining(now: number = Date.now()): number {
  try {
    const stored = localStorage.getItem(AUTH_REDIRECT_LOCK_KEY);
    if (!stored) return 0;
    const ts = parseInt(stored, 10);
    if (isNaN(ts)) return 0;
    const remaining = AUTH_REDIRECT_LOCK_COOLDOWN - (now - ts);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export function setAuthRedirectLock(now: number = Date.now()): void {
  try {
    localStorage.setItem(AUTH_REDIRECT_LOCK_KEY, String(now));
  } catch {
    // ignore
  }
}

export function clearAuthRedirectLock(): void {
  try {
    localStorage.removeItem(AUTH_REDIRECT_LOCK_KEY);
  } catch {
    // ignore
  }
}

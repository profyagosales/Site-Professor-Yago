import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, doLogout, SessionUser } from '@/services/session';

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000;

type AuthSessionInput =
  | SessionUser
  | null
  | {
      role?: SessionUser['role'];
      user?: SessionUser | null;
      teacher?: {
        id?: string | null;
        _id?: string | null;
        name?: string | null;
        email?: string | null;
        photo?: string | null;
        photoUrl?: string | null;
      } | null;
    };

type LogoutOptions = {
  redirect?: boolean;
  location?: string;
};

type AuthState = {
  loading: boolean;
  user: SessionUser | null;
  isTeacher: boolean;
  isStudent: boolean;
  reload: () => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  setSession: (input: AuthSessionInput) => void;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // bootstrap na montagem, sem redirecionar em 401
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return () => {};
    }

    let cancelled = false;

    const keepAlive = async () => {
      try {
        const next = await fetchMe();
        if (cancelled) return;
        setUser(next);
        if (!next) {
          try {
            localStorage.removeItem('role');
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (cancelled) return;
      }
    };

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void keepAlive();
    }, KEEP_ALIVE_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user]);

  const logout = useCallback(async (options: LogoutOptions = {}) => {
    const { redirect = true, location = '/' } = options;
    try {
      await doLogout();
    } catch {
      // ignore logout errors (e.g., already logged out)
    }

    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('role');
      localStorage.removeItem('teacher');
    } catch {
      // ignore storage errors (private mode, etc.)
    }

    setUser(null);

    if (redirect && typeof window !== 'undefined') {
      window.location.href = location ?? '/';
    }
  }, []);

  const setSession = useCallback((input: AuthSessionInput) => {
    if (input === null) {
      setUser(null);
      return;
    }

    const payload: any = input;
    if (payload && typeof payload === 'object' && ('teacher' in payload || 'user' in payload)) {
      const teacherData: any = payload.teacher;
      const userPatch: any = payload.user;
      const rolePatch: SessionUser['role'] | undefined = payload.role;

      if (userPatch && typeof userPatch === 'object') {
        setUser((prev) => {
          const base = { ...(prev ?? {}) } as Record<string, unknown>;
          const merged = { ...base, ...userPatch } as SessionUser;
          merged.role = (userPatch.role ?? rolePatch ?? base.role) as SessionUser['role'];
          if (typeof merged.role === 'string' && merged.role.toLowerCase() === 'teacher') {
            merged.isTeacher = true;
          }
          return merged;
        });
        return;
      }

      if (teacherData && typeof teacherData === 'object') {
        setUser((prev) => {
          const base = { ...(prev ?? {}) } as SessionUser;
          const teacherId = (teacherData.id ?? teacherData._id ?? base.id ?? base._id ?? null) as string | null;
          const photoValue = teacherData.photo ?? teacherData.photoUrl;
          const next: SessionUser = {
            ...base,
            id: teacherId ?? base.id ?? null,
            _id: teacherId ?? base._id ?? null,
            name: teacherData.name ?? teacherData.nome ?? base.name ?? null,
            email: teacherData.email ?? base.email ?? null,
            role: (rolePatch ?? base.role ?? 'teacher') as SessionUser['role'],
            isTeacher: true,
          };
          if (photoValue !== undefined) {
            next.photoUrl = photoValue;
          }
          return next;
        });
        return;
      }

      if (rolePatch) {
        setUser((prev) => ({ ...(prev ?? {}), role: rolePatch } as SessionUser));
        return;
      }
    }

    setUser((prev) => ({ ...(prev ?? {}), ...(payload as SessionUser) }));
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading,
    user,
    isTeacher: (user?.role || '').toLowerCase() === 'teacher',
    isStudent: (user?.role || '').toLowerCase() === 'student',
    reload,
    logout,
    setSession,
  }), [loading, user, reload, logout, setSession]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn('useAuth must be used within <AuthProvider>');
    }
    return {
      loading: true,
      user: null,
      isTeacher: false,
      isStudent: false,
      async reload() {
        throw new Error('AuthProvider ausente: reload indisponível');
      },
      async logout(_options?: LogoutOptions) {
        throw new Error('AuthProvider ausente: logout indisponível');
      },
      setSession() {
        throw new Error('AuthProvider ausente: setSession indisponível');
      },
    };
  }
  return ctx;
}


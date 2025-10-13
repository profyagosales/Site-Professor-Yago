import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, doLogout, SessionUser } from '@/services/session';

type AuthState = {
  loading: boolean;
  user: SessionUser | null;
  isTeacher: boolean;
  isStudent: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
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

  const logout = useCallback(async () => {
    await doLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading,
    user,
    isTeacher: (user?.role || '').toLowerCase() === 'teacher',
    isStudent: (user?.role || '').toLowerCase() === 'student',
    reload,
    logout,
  }), [loading, user, reload, logout]);

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
      async logout() {
        throw new Error('AuthProvider ausente: logout indisponível');
      },
    };
  }
  return ctx;
}


import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api, bootstrapAuthFromStorage, STORAGE_TOKEN_KEY, setAuthToken } from '@/services/api';
import { initializeSession, performLogout } from '@/services/session';

export type User = { id: string; name: string } | null;

export type AuthContextType = {
  user: User;
  loading: boolean;
  setUser: (u: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthStateProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        bootstrapAuthFromStorage();
        initializeSession();
        try {
          const me = await api.get('/auth/me');
          setUser(me.data);
        } catch {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          setAuthToken(undefined);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = () => {
    try {
      performLogout('MANUAL');
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      setAuthToken(undefined);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo<AuthContextType>(() => ({ user, loading, setUser, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthStateProvider');
  return ctx;
}


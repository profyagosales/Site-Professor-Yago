import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { readGerencialToken, storeGerencialToken } from '@/services/gerencialApi';

type GerencialAuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const GerencialAuthContext = createContext<GerencialAuthState | undefined>(undefined);

export function GerencialAuthProvider({ children }: PropsWithChildren) {
  const [token, setTokenState] = useState<string | null>(() => readGerencialToken());

  const setToken = (value: string | null) => {
    setTokenState(value);
    storeGerencialToken(value);
  };

  const logout = () => {
    setToken(null);
  };

  const value = useMemo<GerencialAuthState>(() => ({ token, setToken, logout }), [token]);

  return <GerencialAuthContext.Provider value={value}>{children}</GerencialAuthContext.Provider>;
}

export function useGerencialAuth(): GerencialAuthState {
  const ctx = useContext(GerencialAuthContext);
  if (!ctx) {
    throw new Error('useGerencialAuth deve ser usado dentro de GerencialAuthProvider');
  }
  return ctx;
}

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, setAuthToken, STORAGE_TOKEN_KEY } from "@/services/api";

// meta: evitar fetch sem token e expor helpers simples
type AuthState = { user?: any; role?: "professor" | "aluno" | null; loading: boolean };
type AuthCtx = { 
  state: AuthState; 
  setToken: (t: string | null) => void;
  loginTeacher(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  state: { loading: true, role: null },
  setToken: () => {},
  loginTeacher: async () => {},
  logout: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, role: null });

  const setToken = useCallback((t: string | null) => {
    if (t) {
      localStorage.setItem(STORAGE_TOKEN_KEY, t);
      setAuthToken(t);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      setAuthToken(undefined);
    }
    setState(s => ({ ...s })); // força re-render
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) { 
      setState({ loading: false, role: null }); 
      return; 
    }

    // valida uma única vez; se 401, limpa
    api.get("/auth/me")
      .then(r => setState({ loading: false, user: r.data, role: r.data?.role ?? "professor" }))
      .catch(() => { 
        setToken(null); 
        setState({ loading: false, role: null }); 
      });
  }, [setToken]);

  async function loginTeacher(email: string, password: string) {
    const { data } = await api.post("/auth/login-teacher", { email, password });
    if (data?.token) {
      setToken(data.token);
      const me = await api.get("/auth/me");
      setState({ loading: false, user: me.data, role: me.data?.role ?? "professor" });
    }
  }

  async function logout() {
    try { await api.post("/auth/logout"); } catch {}
    setToken(null);
    setState({ loading: false, role: null });
  }

  return (
    <AuthContext.Provider value={{ state, setToken, loginTeacher, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { 
  return useContext(AuthContext); 
}


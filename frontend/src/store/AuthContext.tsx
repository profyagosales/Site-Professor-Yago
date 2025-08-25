import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, installAuthInterceptors } from "../lib/http";

type User = { id: string; name: string; role: "teacher" | "student" };
type AuthCtx = {
  user: User | null;
  loading: boolean;
  loginTeacher(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    installAuthInterceptors(() => setUser(null));

    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loginTeacher(email: string, password: string) {
    await api.post("/auth/login-teacher", { email, password });
    const { data } = await api.get("/auth/me");
    setUser(data?.user ?? null);
  }

  async function logout() {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, loginTeacher, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);


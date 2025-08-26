import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

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
  const navigate = useNavigate();

  useEffect(() => {
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
    const { data } = await api.post("/auth/login-teacher", { email, password });
    if (data?.token) {
      localStorage.setItem("auth_token", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    }
    const me = await api.get("/auth/me");
    setUser(me.data?.user ?? null);
  }

  async function logout() {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("auth_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    navigate("/login-professor");
  }

  return <Ctx.Provider value={{ user, loading, loginTeacher, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);


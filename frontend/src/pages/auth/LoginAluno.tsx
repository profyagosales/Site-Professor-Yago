import AuthShell from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setAuthToken } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import { fetchMe } from "@/services/session";

export default function LoginAluno() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolveRedirect = (nextParam: string | null): string => {
    const fallback = "/aluno/resumo";
    if (!nextParam) return fallback;

    let decoded = nextParam.trim();
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // preserve original value on decode failure
    }

    if (!decoded || !decoded.startsWith("/") || decoded.startsWith("//")) {
      return fallback;
    }

    return decoded;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await api.post("/auth/login-student", { email, password });
      const payload = response?.data ?? {};
      const data = (payload?.data ?? payload) as Record<string, any>;
      const token = data?.token ?? payload?.token ?? null;
      const userInfo = data?.user ?? null;

      if (token) {
        try {
          localStorage.setItem("auth_token", token);
        } catch {
          // ignore storage failures
        }
        setAuthToken(token);
      }

      if (payload?.success) {
        try {
          localStorage.setItem("role", "student");
        } catch {
          // ignore storage failures
        }
        const redirectTo = resolveRedirect(searchParams.get("next"));
        if (userInfo) {
          auth.setSession({ role: "student", user: { ...userInfo, role: "student" } });
        } else {
          auth.setSession({ role: "student" });
        }
        await auth.reload();
        navigate(redirectTo, { replace: true });
        return;
      }

      const me = await fetchMe(true);
      const meRole = me?.role ? String(me.role).toLowerCase() : "";
      const isStudent = meRole === "student";

      if (isStudent) {
        try {
          localStorage.setItem("role", "student");
        } catch {
          // ignore storage failures
        }
        auth.setSession(me ?? { role: "student" });
        if (!token) {
          const meToken = (me as any)?.token;
          if (meToken) {
            try {
              localStorage.setItem("auth_token", meToken);
            } catch {
              // ignore storage failures
            }
            setAuthToken(meToken);
          }
        }
        const redirectTo = resolveRedirect(searchParams.get("next"));
        navigate(redirectTo, { replace: true });
        return;
      }

      setErro(payload?.message ?? "Erro no login do aluno");
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro no login do aluno");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      roleLabel="Aluno"
      heading="Entrar no portal"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="E-mail"
          type="email"
          required
          value={email}
          autoComplete="email"
          placeholder=""
          onChange={e => setEmail(e.target.value)}
        />
        <Field
          label="Senha"
          type="password"
          required
          value={password}
          autoComplete="current-password"
          placeholder=""
          onChange={e => setPassword(e.target.value)}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
      <div className="mt-6 text-xs text-ys-ink-3">Precisa de ajuda? Procure o professor.</div>
    </AuthShell>
  );
}

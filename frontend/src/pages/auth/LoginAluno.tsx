import AuthShell from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { loginStudent } from "@/services/session";

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
      const redirectTo = resolveRedirect(searchParams.get("next"));
      const session = await loginStudent(email, password);

      auth.setSession({
        role: "student",
        user: { ...session.user, role: "student", isTeacher: false },
      });

      await auth.reload();
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? "Erro no login do aluno";
      setErro(message);
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

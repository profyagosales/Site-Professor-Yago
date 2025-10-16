import AuthShell from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { loginTeacher } from "@/services/session";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolveRedirect = (nextParam: string | null): string => {
    const fallback = "/professor/resumo";
    if (!nextParam) return fallback;

    let decoded = nextParam.trim();
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // keep original value when decode fails
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
      const session = await loginTeacher(email, senha);

      auth.setSession({
        role: "teacher",
        teacher: session.user,
        user: { ...session.user, role: "teacher", isTeacher: true },
      });

      await auth.reload();
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? "Erro no login do professor";
      setErro(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      roleLabel="Professor"
      heading="Entrar na plataforma"
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
          value={senha}
          autoComplete="current-password"
          placeholder=""
          onChange={e => setSenha(e.target.value)}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
      <div className="mt-8 flex justify-end">
        <Link
          to="/gerencial/login"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ys-line text-ys-graphite transition hover:border-ys-ink hover:text-ys-ink"
          aria-label="Acessar área gerencial"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 13a7.46 7.46 0 0 0 .06-2l2.06-1.6-2-3.46-2.5.56a7.54 7.54 0 0 0-1.72-1l-.39-2.55H10L9.61 5.5a7.54 7.54 0 0 0-1.72 1l-2.5-.56-2 3.46L5.45 11a7.46 7.46 0 0 0 0 2l-2.06 1.6 2 3.46 2.5-.56a7.54 7.54 0 0 0 1.72 1l.39 2.55h4.52l.39-2.55a7.54 7.54 0 0 0 1.72-1l2.5.56 2-3.46L19.4 13Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </AuthShell>
  );
}

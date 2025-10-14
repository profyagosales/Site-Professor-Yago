import AuthShell from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/store/AuthContext";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const response = await api.post("/auth/login-teacher", { email, password: senha }, { withCredentials: true });
      const payload = response?.data ?? {};
      const data = (payload?.data ?? payload) as Record<string, any>;
      const token = data?.token ?? payload?.token;
      const teacherInfo = data?.teacher ?? data?.user ?? null;
      const role = (data?.role ?? payload?.role ?? data?.user?.role ?? "") as string;
      const isTeacher = (role || "").toLowerCase() === "teacher" || Boolean(data?.isTeacher ?? payload?.isTeacher);

      if (payload?.success && isTeacher) {
        if (token) {
          localStorage.setItem("auth_token", token);
        }
        localStorage.setItem("role", "teacher");
        if (teacherInfo) {
          try {
            localStorage.setItem("teacher", JSON.stringify(teacherInfo));
          } catch {
            // ignore serialization errors
          }
        }
        const sessionPayload: any = { role: "teacher" };
        if (teacherInfo) {
          sessionPayload.teacher = teacherInfo;
          sessionPayload.user = teacherInfo;
        }
        auth?.setSession?.(sessionPayload);
        void auth?.reload?.();
        navigate("/professor/classes", { replace: true });
        return;
      }

      const meResponse = await api
        .get("/me", { withCredentials: true, meta: { skipAuthRedirect: true, noCache: true } })
        .catch(() => null);
      const meData = meResponse?.data ?? null;
      const meRole: string | undefined = meData?.role ?? meData?.user?.role;
      const meIsTeacher = Boolean(
        (meRole && meRole.toLowerCase() === "teacher") || meData?.isTeacher
      );

      if (meIsTeacher) {
        localStorage.setItem("role", "teacher");
        if (meData?.user) {
          try {
            localStorage.setItem("teacher", JSON.stringify(meData.user));
          } catch {
            /* ignore */
          }
        }
        auth?.setSession?.({ role: "teacher", user: meData?.user ?? { id: meData?.id ?? null, email: meData?.email ?? null, role: "teacher" } });
        void auth?.reload?.();
        navigate("/professor/classes", { replace: true });
        return;
      }

      setErro(payload?.message ?? "Credenciais válidas, mas sem permissão de professor.");
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro no login do professor");
    }
  }

  return (
    <AuthShell
      roleLabel="Professor"
      heading="Entrar na plataforma"
      subheading="Use seu e-mail institucional e sua senha."
      bullets={[
        'Acesse suas turmas rapidamente',
        'Lance notas e publique avisos',
        'Corrija redações e gere relatórios',
      ]}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" type="email" required value={email} placeholder="seunome@escola.df.gov.br" autoComplete="email" onChange={e=>setEmail(e.target.value)} />
        <Field label="Senha" type="password" required value={senha} placeholder="••••••••" autoComplete="current-password" onChange={e=>setSenha(e.target.value)} />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="pt-2">
          <Button type="submit" className="w-full">Entrar</Button>
        </div>
      </form>
      <div className="mt-6 text-xs text-ys-ink-3">
        Dica: se esqueceu a senha, entre em contato com a coordenação.
      </div>
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

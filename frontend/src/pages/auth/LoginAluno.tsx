import AuthShell from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

export default function LoginAluno() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const { data } = await api.post("/auth/login-student", { email, password });
      if (data?.success) {
        const t = data?.data?.token;
        if (t) localStorage.setItem('auth_token', t);
        localStorage.setItem("role", "student");
  navigate("/aluno/resumo", { replace: true });
      } else {
        setErro(data?.message ?? "Erro no login do aluno");
      }
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro no login do aluno");
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
          <Button type="submit" className="w-full">Entrar</Button>
        </div>
      </form>
      <div className="mt-6 text-xs text-ys-ink-3">Precisa de ajuda? Procure o professor.</div>
    </AuthShell>
  );
}

import AuthShell from "@/components/auth/AuthShell";
import { CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setAuthToken } from "@/services/api";
import { ROUTES } from "@/routes";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (localStorage.getItem("auth_token")) navigate(ROUTES.prof.resumo, { replace: true });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const { data } = await api.post("/auth/login-teacher", { email, password: senha });
      if (data?.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("role", "teacher");
        setAuthToken(data.token);
        navigate(ROUTES.prof.resumo, { replace: true });
      } else {
        setErro(data?.message || "Erro no login");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setErro(error?.response?.data?.message || "Erro no login do professor");
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
    </AuthShell>
  );
}

import { Page } from "@/components/Page";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    try {
      // IMPORTANTE: backend espera "password"
      await api.post("/auth/login-teacher", { email, password: senha });

      // checa sessão e vai pra dashboard
      await api.get("/auth/me");
      navigate("/professor/dashboard", { replace: true });
    } catch (err: any) {
      setErro(err?.response?.data?.message || "Erro no login do professor");
    }
  }

  return (
    <Page title="Login Professor" subtitle="Use seu e-mail e senha cadastrados.">
      <div className="max-w-xl">
        <Card>
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="E-mail" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
              <Field label="Senha" type="password" required value={senha} onChange={e=>setSenha(e.target.value)} />
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button type="submit">Entrar</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}


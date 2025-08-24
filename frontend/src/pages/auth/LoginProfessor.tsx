import { Page } from "@/components/Page";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { api } from "@/lib/http";

export default function LoginProfessor() {
  const [email, setEmail] = useState("");
  const [senha, setSenha]   = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login-teacher", {
        email, password: senha
      });
      if (data?.token) {
        localStorage.setItem("teacher_token", data.token);
        location.assign("/turmas");
      } else {
        setErro("Falha ao fazer login. Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      setErro(err?.response?.data?.message || "Erro no login do professor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Login Professor" subtitle="Use seu e-mail e senha cadastrados.">
      <div className="max-w-xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="E-mail" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
              <Field label="Senha" type="password" required value={senha} onChange={e=>setSenha(e.target.value)} />
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}


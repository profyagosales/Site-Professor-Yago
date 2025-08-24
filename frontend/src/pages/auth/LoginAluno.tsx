import { Page } from "@/components/Page";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import axios from "axios";
import { API_URL } from "@/lib/env";
import { useNavigate } from "react-router-dom";

export default function LoginAluno() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const { data, status } = await axios.post(`${API_URL}/auth/login-student`, { email, password: senha });
      console.log("[LOGIN] status:", status, data);
      if (data?.token) {
        localStorage.setItem("student_token", data.token);
        navigate("/dashboard-aluno");
      } else {
        setErro("Falha ao fazer login. Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      setErro(err?.response?.data?.message || "Erro no login do aluno");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Login Aluno" subtitle="Use seu e-mail e senha cadastrados.">
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


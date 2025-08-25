import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/http";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const { data } = await api.post("/auth/login-teacher", { email, password: senha });
      if (data?.success) {
        // save token for Bearer flows (cookie also set by backend)
        const t = data?.data?.token;
        if (t) localStorage.setItem('auth_token', t);
        localStorage.setItem("role", "teacher");
        navigate("/professor/turmas", { replace: true });
      } else {
        setErro(data?.message ?? "Erro no login do professor");
      }
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro no login do professor");
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-ys-ink-2 hover:text-ys-ink transition-colors text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mr-2">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar</Link>
      </div>

      <Card>
        <div className="grid md:grid-cols-2">
          {/* Lado esquerdo: marca/identidade */}
          <div className="relative hidden md:block rounded-2xl md:rounded-r-none md:rounded-l-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-ys-amber/15 to-white" />
            <div className="relative h-full p-8 flex flex-col justify-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-ys-line shadow-ys-glow">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="6" stroke="#FF7A00" strokeWidth="2" />
                  <path d="M7 9l3 3-3 3" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 9h3m-3 6h3" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-ys-ink">Professor Yago</h1>
              <p className="text-ys-ink-2 mt-1">Notas • Redação • Recados • Gabaritos</p>
              <ul className="mt-6 space-y-2 text-sm text-ys-ink-2">
                <li className="flex items-start"><span className="text-ys-amber mr-2">•</span> Acesse suas turmas rapidamente</li>
                <li className="flex items-start"><span className="text-ys-amber mr-2">•</span> Lance notas e publique avisos</li>
                <li className="flex items-start"><span className="text-ys-amber mr-2">•</span> Corrija redações e gere relatórios</li>
              </ul>
            </div>
          </div>

          {/* Lado direito: formulário */}
          <CardBody className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="tracking-[0.25em] text-xs text-ys-ink-3 mb-2">PROFESSOR</p>
              <h2 className="text-2xl font-extrabold text-ys-ink">Entrar na plataforma</h2>
              <p className="text-ys-ink-2 mt-1 text-sm">Use seu e-mail institucional e sua senha.</p>
            </div>

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
          </CardBody>
        </div>
      </Card>
    </section>
  );
}

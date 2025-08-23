import "@/styles/landing.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "@api";
import { toast } from "react-toastify";

export default function LoginAluno() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const ok = await loginStudent({ email, password: senha });
      if (ok) nav("/dashboard-aluno");
      else toast.error("E-mail ou senha inválidos");
    } catch {
      toast.error("E-mail ou senha inválidos");
    }
  }

  return (
    <main className="auth-bg">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-watermark">YS</div>
        <h1 className="auth-title">Login Aluno</h1>

        <input
          className="auth-field"
          type="email"
          placeholder="E-mail"
          aria-label="E-mail"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="auth-field"
          type="password"
          placeholder="Senha"
          aria-label="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <button className="auth-submit" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}

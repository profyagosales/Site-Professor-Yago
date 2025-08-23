import "@/styles/landing.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "@api";

export default function LoginAluno() {
  const [numero, setNumero] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    const { token, role } = await loginStudent({ rollNumber: numero, phone: telefone, password: senha });
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("role", role || "student");
    nav("/dashboard-aluno", { replace: true });
  }

  return (
    <main className="auth-bg">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-watermark">YS</div>
        <h1 className="auth-title">Login Aluno</h1>

        <input className="auth-field" placeholder="Número" value={numero}
               onChange={(e) => setNumero(e.target.value)} required />
        <input className="auth-field" placeholder="Telefone" value={telefone}
               onChange={(e) => setTelefone(e.target.value)} required />
        <input className="auth-field" type="password" placeholder="Senha" value={senha}
               onChange={(e) => setSenha(e.target.value)} required />

        <button className="auth-submit" type="submit">Entrar</button>
      </form>
    </main>
  );
}

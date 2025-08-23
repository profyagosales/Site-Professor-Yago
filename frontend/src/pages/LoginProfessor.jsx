import "@/styles/landing.css"; // para usar o mesmo gradiente/estilos
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginTeacher } from '@/services/auth';

export default function LoginProfessor() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    const { token, role } = await loginTeacher({ email, password: senha });
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("role", role || "teacher");
    nav("/dashboard-professor", { replace: true });
  }

  return (
    <main className="auth-bg">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-watermark">YS</div>
        <h1 className="auth-title">Login Professor</h1>

        <input className="auth-field" type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="auth-field" type="password" placeholder="Senha"
               value={senha} onChange={(e) => setSenha(e.target.value)} required />

        <button className="auth-submit" type="submit">Entrar</button>
      </form>
    </main>
  );
}

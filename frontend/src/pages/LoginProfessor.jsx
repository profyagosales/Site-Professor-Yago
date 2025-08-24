import "@/styles/landing.css"; // para usar o mesmo gradiente/estilos
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function LoginProfessor() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    if (!email || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login-teacher", { email, senha });
      console.log("[LOGIN] status:", res.status, res.data);
      setLoading(false);
      if (res.status === 200) {
        if (res.data?.token) localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data?.role || "teacher");
        nav("/turmas", { replace: true });
      } else if (res.status === 401) {
        setErro(res.data?.message || "Credenciais inválidas.");
      } else if (res.status === 400) {
        setErro(res.data?.message || "Preencha os campos corretamente.");
      } else {
        setErro(res.data?.message || "Falha ao fazer login. Tente novamente.");
      }
    } catch (err) {
      setLoading(false);
      setErro(err.response?.data?.message || "Falha ao fazer login. Tente novamente.");
    }
  }

  return (
    <main className="auth-bg">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-watermark">YS</div>
        <h1 className="auth-title">Login Professor</h1>

        {erro && <p style={{ color: 'red', textAlign: 'center', marginBottom: '8px' }}>{erro}</p>}

        <input className="auth-field" type="email" placeholder="Email"
               value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="auth-field" type="password" placeholder="Senha"
               value={senha} onChange={(e) => setSenha(e.target.value)} required />

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

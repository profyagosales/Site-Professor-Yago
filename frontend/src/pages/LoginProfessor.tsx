import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/env";

export default function LoginProfessor() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login-teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Falha ao fazer login.");
      }
      // ajuste as chaves conforme o backend
      localStorage.setItem("teacher_token", data.token);
      localStorage.setItem("teacher", JSON.stringify(data.teacher || {}));
      nav("/turmas"); // ou "/dashboard-professor"
    } catch (e: any) {
      setErr(e?.message || "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] grid place-items-center px-4">
      <section className="ys-card">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Login Professor
        </h1>
        <p className="ys-helper mt-1">
          Use seu e-mail e senha cadastrados.
        </p>

        {err && <div className="ys-error">{err}</div>}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="ys-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              className="ys-input"
              placeholder="prof@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="ys-label" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              className="ys-input"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ys-btn--primary w-full"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}


import { useNavigate } from "react-router-dom";
import { YSLogoAlive } from "@/components/YSLogoAlive";
import "@/styles/landing.css";

export default function Landing() {
  const nav = useNavigate();

  return (
    <main className="auth-bg no-nav">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-10 px-6">
        <YSLogoAlive />

        <div className="flex items-center gap-4" role="group" aria-label="Escolha de acesso">
          <button
            onClick={() => nav("/login-professor")}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-orange-600 shadow-xl transition hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            Sou Professor
          </button>
          <button
            onClick={() => nav("/login-aluno")}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-orange-600 shadow-xl transition hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            Sou Aluno
          </button>
        </div>
      </div>
    </main>
  );
}

import { useNavigate } from "react-router-dom";
import AnimatedLogo from "@/components/brand/AnimatedLogo";
import "@/styles/landing.css";

export default function Landing() {
  const nav = useNavigate();

  return (
    <main className="auth-bg">
      <section className="landing-stack" aria-label="Acesso">
        <AnimatedLogo />

        <div className="subline">Professor</div>
        <div className="brandline">Yago Sales</div>

        <div className="landing-actions" role="group" aria-label="Escolha de acesso">
          <button className="landing-btn" onClick={() => nav("/login-professor")}>Sou Professor</button>
          <button className="landing-btn" onClick={() => nav("/login-aluno")}>Sou Aluno</button>
        </div>
      </section>
    </main>
  );
}

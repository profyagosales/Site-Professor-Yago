import { YSLogoAlive } from "./YSLogoAlive";
import { Link } from "react-router-dom";

export function Hero(){
  return (
    <section className="min-h-[90vh] grid place-items-center px-6">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* 1) YS sozinho, no topo */}
        <YSLogoAlive/>

        {/* 2) Lockup colado (não “solto”) */}
        <div className="text-center -mt-1">
          <div className="tracking-[0.55em] text-xs md:text-sm text-white/60 mb-1">
            PROFESSOR
          </div>
          <h1 className="font-display text-[40px] md:text-[56px] leading-tight">
            <span className="bg-gradient-to-r from-white to-white/75 bg-clip-text text-transparent">
              Yago Sales
            </span>
          </h1>
        </div>

        {/* 3) Ações */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <Link to="/login-professor" className="btn btn-primary glass">Sou Professor</Link>
          <Link to="/login-aluno" className="btn btn-ghost">Sou Aluno</Link>
        </div>
      </div>
    </section>
  );
}

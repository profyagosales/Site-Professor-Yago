import React from 'react';
import { useNavigate } from 'react-router-dom';
import YSLogo from '@/components/brand/YSLogo';

export default function Landing(){
  const nav = useNavigate();
  const year = new Date().getFullYear();

  return (
    <main className="relative min-h-[calc(100vh-64px)] flex flex-col items-center">
      <section className="w-full max-w-5xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-20">
        {/* Logo */}
        <div className="flex justify-center">
          <YSLogo size={156} tone="#ff6a00" />
        </div>

        {/* Títulos e CTAs */}
        <div className="mt-8 text-center">
          <p className="tracking-[0.5em] text-xs md:text-sm text-slate-300/85">PROFESSOR</p>
          <h1 className="mt-3 text-4xl md:text-[56px] leading-tight font-extrabold" style={{color:'#ff6a00'}}>
            Yago Sales
          </h1>
          <p className="mt-3 text-slate-200/90 max-w-2xl mx-auto text-base md:text-lg">
            Notas • Redação • Recados • Gabaritos
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <button className="btn-brand" onClick={()=>nav('/login-professor')}>Sou Professor</button>
            <button className="btn-ghost" onClick={()=>nav('/login-aluno')}>Sou Aluno</button>
          </div>
        </div>

        {/* === CARD ÚNICO CENTRAL === */}
        <div className="mt-14 md:mt-20 flex justify-center">
          <div className="card w-full max-w-3xl text-center p-6 md:p-10">
            <h3 className="text-xl md:text-2xl font-semibold text-white/95">
              Centro de Ensino Médio 01 do Paranoá — <span style={{color:'#ff6a00'}}>CEM 01 do Paranoá</span>
            </h3>

            <p className="mt-3 text-slate-300/90 text-base md:text-lg">
              Controle de notas, redação, gabaritos e avisos
            </p>

            <p className="mt-4 text-slate-300/90">
              Desenvolvido por <span className="font-semibold" style={{color:'#ff6a00'}}>Professor Yago Sales</span>
            </p>

            <hr className="my-6 border-white/10" />

            <p className="text-xs text-slate-400/80">
              © {year} Yago Sales. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}


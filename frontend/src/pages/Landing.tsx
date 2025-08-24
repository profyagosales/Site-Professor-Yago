import React from 'react';
import { useNavigate } from 'react-router-dom';
import YSLogo from '@/components/brand/YSLogo';

export default function Landing(){
  const nav = useNavigate();

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

        {/* end hero section */}
      </section>

      {/* CARD INSTITUCIONAL — compacto */}
      <section className="w-full px-6 md:px-10 mt-10 mb-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white/60 ring-1 ring-[var(--ring)] backdrop-blur-sm px-6 py-6 md:px-8 md:py-7 shadow-[0_1px_0_rgba(255,255,255,.5),0_12px_24px_rgba(15,23,42,.06)]">
          <h3 className="text-center font-semibold text-slate-800 text-lg">
            Centro de Ensino Médio 01 do Paranoá
          </h3>
          <p className="text-center text-[15px] text-slate-700 mt-0.5">
            <span className="font-semibold text-slate-800">CEM 01 do Paranoá</span>
          </p>

          <p className="text-center text-[15px] text-slate-700 mt-3">
            Controle de notas, redação, gabaritos e avisos
          </p>

          <p className="text-center text-[14px] text-slate-600 mt-3">
            Desenvolvido por <span className="font-semibold" style={{color:'var(--brand)'}}>Professor Yago Sales</span>
          </p>

          <hr className="my-5 border-white/70" />

          <p className="text-center text-[12px] text-slate-600">
            © {new Date().getFullYear()} Yago Sales. Todos os direitos reservados.
          </p>
        </div>
      </section>
    </main>
  );
}


import React from 'react';
import { useNavigate } from 'react-router-dom';
import YSLogo from '@/components/brand/YSLogo';
import { Button } from '@/components/ui/Button';

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
          <p className="tracking-[0.5em] text-xs md:text-sm text-muted/80">PROFESSOR</p>
          <h1 className="mt-3 text-4xl md:text-[56px] leading-tight font-extrabold text-body">
            Yago Sales
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-base md:text-lg text-muted/90">
            Notas • Redação • Recados • Gabaritos
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button onClick={() => nav('/login-professor')}>Sou Professor</Button>
            <Button onClick={() => nav('/login-aluno')} className="ml-3">Sou Aluno</Button>
          </div>
        </div>

        {/* end hero section */}
      </section>

      {/* CARD INSTITUCIONAL — compacto */}
      <section className="w-full px-6 md:px-10 mt-10 mb-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white/60 ring-1 ring-[var(--ring)] backdrop-blur-sm px-6 py-6 md:px-8 md:py-7 shadow-[0_1px_0_rgba(255,255,255,.5),0_12px_24px_rgba(15,23,42,.06)]">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-body">
              Centro de Ensino Médio 01 do Paranoá
            </h3>
            <p className="text-sm text-muted/90 mt-1">
              CEM 01 do Paranoá
            </p>
            <p className="text-sm text-muted mt-3">
              Controle de notas, redação, gabaritos e avisos
            </p>
            <p className="text-xs text-muted/80 mt-4">
              Desenvolvido por <span className="font-medium text-body">Professor Yago Sales</span>
            </p>
            <p className="text-[11px] text-muted/70 mt-2">
              © {new Date().getFullYear()} Yago Sales. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}


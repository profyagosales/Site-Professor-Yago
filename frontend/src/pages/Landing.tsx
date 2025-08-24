import React from 'react';
import { useNavigate } from 'react-router-dom';
import YSLogo, { IconProfessor, IconAluno } from '@/components/brand/YSLogo';

export default function Landing(){
  const nav = useNavigate();

  return (
    <main className="relative min-h-screen flex flex-col items-center">
      {/* Camada animada do fundo (só visual) */}
      <div className="bg-animated-gray" />

      {/* CONTAINER */}
      <section className="w-full max-w-5xl mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-20">
        {/* Marca grande no topo */}
        <div className="flex justify-center">
          <YSLogo size={148} tone="#ff6a00" />
        </div>

        {/* Bloco textual */}
        <div className="mt-10 text-center">
          <p className="tracking-[0.5em] text-xs md:text-sm text-slate-300/80">PROFESSOR</p>
          <h1 className="mt-3 text-4xl md:text-[56px] leading-tight font-extrabold" style={{color:'#ff6a00'}}>
            Yago Sales
          </h1>

          {/* Subcopy opcional */}
          <p className="mt-3 text-slate-300/80 max-w-2xl mx-auto text-base md:text-lg">
            Notas • Redação • Recados • Gabaritos
          </p>

          {/* Ações */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <button
              className="btn-brand inline-flex items-center gap-2"
              onClick={()=>nav('/login-professor')}
            >
              <IconProfessor /> Sou Professor
            </button>
            <button
              className="btn-ghost inline-flex items-center gap-2"
              onClick={()=>nav('/login-aluno')}
            >
              <IconAluno /> Sou Aluno
            </button>
          </div>
        </div>

        {/* Cart de destaque opcional (vidro suave) */}
        <div className="mt-14 md:mt-20 glass p-5 md:p-8">
          <div className="grid md:grid-cols-3 gap-5 text-sm text-slate-200/90">
            <Feature title="Visual limpo" desc="Interface leve, tipografia forte e contraste perfeito no cinza animado." />
            <Feature title="Fluxo rápido" desc="Entradas claras e CTAs diretas para professor e aluno." />
            <Feature title="Marca viva" desc="YS laranja com micro-animação sutil — presença elegante, sem exageros." />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({title, desc}:{title:string;desc:string}){
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="font-semibold text-white/95 mb-1">{title}</h3>
      <p className="text-slate-300/85">{desc}</p>
    </div>
  );
}


import React from 'react';
import { Outlet, Link } from 'react-router-dom';
// import Particles from '@/components/ambient/Particles';
import YSLogo from '@/components/brand/YSLogo';

export default function AppShell(){
  return (
    <div className="min-h-screen text-body">
      {/* Camada de fundo super leve */}
      <div className="app-bg" />

      {/* Opcional: partículas OFF por padrão para leveza */}
      {/* <Particles maxParticles={16} /> */}

      <div className="relative min-h-screen">
        <header className="topbar">
          <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80">
            <YSLogo size={28} />
            <span className="font-semibold tracking-wide">YS</span>
          </Link>
          <nav className="ml-auto flex items-center gap-10 text-sm text-muted">
            <Link to="/login-professor" className="hover:text-body">Professor</Link>
            <Link to="/login-aluno" className="hover:text-body">Aluno</Link>
          </nav>
        </header>

        <Outlet />
      </div>
    </div>
  );
}

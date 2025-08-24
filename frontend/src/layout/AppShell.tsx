import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import ParticlesBG from '@/components/fx/ParticlesBG';
import YSLogo from '@/components/brand/YSLogo';

export default function AppShell(){
  return (
    <div className="min-h-screen relative">
      <div className="bg-animated-gray" />
      <ParticlesBG />

      <header className="topbar">
        <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
          <YSLogo size={28} />
          <span className="font-semibold tracking-wide">YS</span>
        </Link>
        <nav className="ml-auto flex items-center gap-10 text-sm text-slate-200/85">
          <Link to="/login-professor" className="hover:text-white">Professor</Link>
          <Link to="/login-aluno" className="hover:text-white">Aluno</Link>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

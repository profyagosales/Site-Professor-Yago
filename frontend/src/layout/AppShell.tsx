import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
// import Particles from '@/components/ambient/Particles';
import YSLogo from '@/components/brand/YSLogo';
import { NAV_TEACHER, NAV_STUDENT } from '@/config/nav';

function getRole(): 'teacher' | 'student' | 'guest' {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('teacher_token')) return 'teacher';
    if (localStorage.getItem('student_token')) return 'student';
  }
  return 'guest';
}

export default function AppShell() {
  const role = getRole();
  const nav = role === 'teacher' ? NAV_TEACHER : role === 'student' ? NAV_STUDENT : [];

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
            {nav.length > 0 ? (
              nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'hover:text-body',
                      isActive && 'text-body font-semibold',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))
            ) : (
              <>
                <Link to="/login-professor" className="hover:text-body">
                  Professor
                </Link>
                <Link to="/login-aluno" className="hover:text-body">
                  Aluno
                </Link>
              </>
            )}
          </nav>
        </header>

        <Outlet />
      </div>
    </div>
  );
}

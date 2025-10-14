import { NavLink, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import Avatar from "./Avatar";
import { useAuth } from '@/store/AuthContext';

type NavItem = { label: string; to: string; primary?: boolean; variant?: 'default' | 'pas' };

function getStoredRole(): "teacher" | "student" | "guest" {
  try {
    return (localStorage.getItem("role") as any) || "guest";
  } catch {
    return "guest";
  }
}

const unbBtn = "text-white rounded-xl px-4 py-2 font-medium bg-[linear-gradient(90deg,#00c4cc,#3e9d5a)]";

const NAV_TEACHER: NavItem[] = [
  { label: "Resumo", to: "/professor/resumo", primary: true },
  { label: "Turmas", to: "/professor/classes" },
  { label: "Redação", to: "/professor/redacao" },
  { label: "PAS/UnB", to: "/professor/pas-unb", variant: "pas" },
];

const NAV_STUDENT: NavItem[] = [
  { label: "Resumo", to: "/aluno/resumo", primary: true },
  { label: "Minhas Notas", to: "/aluno/notas" },
  { label: "Redação", to: "/aluno/redacoes" },
  { label: "PAS/UnB", to: "/aluno/pas-unb", variant: "pas" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { isTeacher, isStudent, logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = isTeacher ? "teacher" : isStudent ? "student" : getStoredRole();
  const nav = role === "teacher" ? NAV_TEACHER : role === "student" ? NAV_STUDENT : [];
  const hideNav = ["/login-professor", "/login-aluno"].includes(loc.pathname);
  const logoTarget = isTeacher ? "/professor/resumo" : nav[0]?.to ?? "/";
  const displayName = (user?.name as string | undefined) ?? '';
  const avatarSource = (user?.photoUrl as string | undefined) ?? ((user as any)?.avatarUrl as string | undefined) ?? null;
  const hasNav = role !== "guest" && nav.length > 0;

  const handleLogout = async () => {
    await logout({ redirect: true, location: '/' });
  };

  return (
  <div className="relative min-h-screen text-ys-ink z-10">
      {!hideNav && (
        <header className="sticky top-0 z-40 border-b border-ys-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-4">
              {hasNav && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800 md:hidden"
                  aria-label="Abrir menu"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </svg>
                </button>
              )}
              <Link
                to={logoTarget}
                className="flex items-center gap-4 text-slate-800 transition hover:opacity-90"
              >
                <img
                  src="/logo.svg"
                  alt="Prof. Yago Sales"
                  className="h-12 w-12 rounded-2xl border border-white/20 bg-white object-cover shadow-sm"
                />
                <span className="text-lg font-semibold tracking-tight sm:text-xl">Professor Yago Sales</span>
              </Link>
            </div>

            {nav.length > 0 && (
              <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
                {nav.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    className={({ isActive }) =>
                      i.variant === "pas"
                        ? [
                            unbBtn,
                            "shadow-sm transition",
                            isActive ? "ring-2 ring-white/60" : "opacity-95 hover:opacity-100",
                          ].join(" ")
                        : [
                            "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                            i.primary ? "text-slate-700" : "text-slate-600",
                            isActive
                              ? "bg-orange-50 text-orange-600"
                              : "hover:bg-orange-50 hover:text-orange-600",
                          ].join(" ")
                    }
                  >
                    {i.label}
                  </NavLink>
                ))}
              </nav>
            )}

            <div className="flex flex-1 items-center justify-end gap-3">
              {role !== "guest" && (
                <>
                  <Avatar
                    src={avatarSource}
                    name={displayName || 'Usuário'}
                    size={40}
                    className="border border-slate-200 shadow-sm"
                  />

            {menuOpen && hasNav && (
              <div className="fixed inset-0 z-50 flex md:hidden">
                <button
                  type="button"
                  aria-label="Fechar menu"
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setMenuOpen(false)}
                />
                <aside className="relative z-10 flex h-full w-72 flex-col gap-6 bg-white px-6 py-8 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Menu</p>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                      aria-label="Fechar menu"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M7 7l10 10M17 7l-10 10" />
                      </svg>
                    </button>
                  </div>
                  <nav className="flex flex-col gap-2">
                    {nav.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          item.variant === "pas"
                            ? [
                                unbBtn,
                                "text-center shadow-sm",
                                isActive ? "ring-2 ring-[#00c4cc]/60" : "opacity-95",
                              ].join(" ")
                            : [
                                "rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition",
                                isActive ? "bg-slate-100" : "hover:bg-slate-50",
                              ].join(" ")
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleLogout();
                    }}
                    className="mt-auto rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    Sair
                  </button>
                </aside>
              </div>
            )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    Sair
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

  <main className="relative z-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}

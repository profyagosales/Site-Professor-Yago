import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from '@/store/AuthContext';

type NavItem = { label: string; to: string; primary?: boolean };

function getStoredRole(): "teacher" | "student" | "guest" {
  try {
    return (localStorage.getItem("role") as any) || "guest";
  } catch {
    return "guest";
  }
}

const NAV_TEACHER: NavItem[] = [
  { label: "Resumo", to: "/professor/resumo", primary: true },
  { label: "Turmas", to: "/professor/classes" },
  { label: "Redação", to: "/professor/redacao" },
];

const NAV_STUDENT: NavItem[] = [
  { label: "Minhas Notas", to: "/aluno/notas" },
  { label: "Redação", to: "/aluno/redacoes" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const { isTeacher, isStudent, logout } = useAuth();
  const role = isTeacher ? "teacher" : isStudent ? "student" : getStoredRole();
  const nav = role === "teacher" ? NAV_TEACHER : role === "student" ? NAV_STUDENT : [];
  const hideNav = ["/login-professor", "/login-aluno"].includes(loc.pathname);
  const logoTarget = isTeacher ? "/professor/resumo" : isStudent ? "/aluno/notas" : "/";

  const handleLogout = async () => {
    await logout({ redirect: true, location: '/' });
  };

  return (
  <div className="relative min-h-screen text-ys-ink z-10">
      {!hideNav && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ys-line">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link to={logoTarget} className="flex items-center gap-3 text-slate-800">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white text-lg font-black shadow-sm">
                YS
              </span>
              <span className="text-base font-semibold tracking-tight">Professor Yago Sales</span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 sm:flex">
              {nav.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) =>
                    [
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

            <div className="ml-auto flex items-center gap-2">
              {role !== "guest" && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                >
                  Sair
                </button>
              )}
            </div>
          </div>
        </header>
      )}

  <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

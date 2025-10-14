import { NavLink, Link, useLocation } from "react-router-dom";
import Avatar from "./Avatar";
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
  const { isTeacher, isStudent, logout, user } = useAuth();
  const role = isTeacher ? "teacher" : isStudent ? "student" : getStoredRole();
  const nav = role === "teacher" ? NAV_TEACHER : role === "student" ? NAV_STUDENT : [];
  const hideNav = ["/login-professor", "/login-aluno"].includes(loc.pathname);
  const logoTarget = isTeacher ? "/professor/resumo" : nav[0]?.to ?? "/";
  const displayName = (user?.name as string | undefined) ?? '';
  const avatarSource = (user?.photoUrl as string | undefined) ?? ((user as any)?.avatarUrl as string | undefined) ?? null;

  const handleLogout = async () => {
    await logout({ redirect: true, location: '/' });
  };

  return (
  <div className="relative min-h-screen text-ys-ink z-10">
      {!hideNav && (
        <header className="sticky top-0 z-40 border-b border-ys-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-4">
              <Link
                to={logoTarget}
                className="flex items-center gap-4 text-slate-800 transition hover:opacity-90"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white text-xl font-black shadow-sm">
                  YS
                </span>
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

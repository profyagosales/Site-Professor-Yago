import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { setAuthToken } from "@/services/api";

type NavItem = { label: string; to: string; primary?: boolean };

function getRole(): "teacher" | "student" | "guest" {
  return (localStorage.getItem("role") as any) || "guest";
}

const NAV_TEACHER: NavItem[] = [
  { label: "Resumo", to: ROUTES.prof.resumo, primary: true },
  { label: "Turmas", to: ROUTES.prof.turmas },
  { label: "Notas da Classe", to: ROUTES.prof.notas },
  { label: "Caderno", to: ROUTES.prof.caderno },
  { label: "Gabarito", to: ROUTES.prof.gabarito },
  { label: "Redação", to: ROUTES.prof.redacao },
];

const NAV_STUDENT: NavItem[] = [
  { label: "Minhas Notas", to: ROUTES.aluno.notas },
  { label: "Caderno", to: ROUTES.aluno.caderno },
  { label: "Gabarito", to: ROUTES.aluno.gabaritos },
  { label: "Redação", to: ROUTES.aluno.redacoes },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const nav = role === "teacher" ? NAV_TEACHER : role === "student" ? NAV_STUDENT : [];
  const hideNav = [ROUTES.auth.loginProf, ROUTES.auth.loginAluno].includes(loc.pathname);

  function goHomeByRole() {
    const token = localStorage.getItem("auth_token");
    if (token && role === "teacher") return ROUTES.prof.resumo;
    if (token && role === "student") return ROUTES.aluno.landing;
    return ROUTES.home;
  }

  function handleLogout() {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("role");
      setAuthToken(undefined);
    } catch {}
    const target = role === "teacher" ? ROUTES.auth.loginProf : role === "student" ? ROUTES.auth.loginAluno : ROUTES.home;
    navigate(target, { replace: true });
  }

  return (
    <div className="relative min-h-screen text-ys-ink z-10">
      {!hideNav && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ys-line">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to={goHomeByRole()} className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ys-amber text-white font-black">
                YS
              </span>
              <span className="font-semibold text-ys-ink">Professor Yago</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 justify-center flex-1">
              {nav.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) =>
                    [
                      "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
                      isActive ? "bg-orange-100 text-orange-700 font-semibold" : "text-gray-800 hover:bg-gray-100",
                      i.primary && !isActive ? "font-semibold" : "",
                    ].join(" ")
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden sm:flex items-center">
              {nav.length > 0 && (
                <button
                  onClick={handleLogout}
                  className="ml-3 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-100"
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

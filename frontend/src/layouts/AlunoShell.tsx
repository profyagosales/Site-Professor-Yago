import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { setAuthToken, STORAGE_TOKEN_KEY } from "@/services/api";
import { usePrefetch } from "@/hooks/usePrefetch";

type NavItem = { label: string; to: string; primary?: boolean };

const NAV_ALUNO: NavItem[] = [
  { label: "Resumo", to: ROUTES.aluno.resumo, primary: true },
  { label: "Notas", to: ROUTES.aluno.notas },
  { label: "Recados", to: ROUTES.aluno.recados },
  { label: "Redação", to: ROUTES.aluno.redacao },
  { label: "Caderno", to: ROUTES.aluno.caderno },
  { label: "Gabaritos", to: ROUTES.aluno.gabaritos },
];

export default function AlunoShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { prefetchRoute } = usePrefetch();
  const hideNav = [ROUTES.auth.loginProf, ROUTES.aluno.login].includes(loc.pathname);

  function goHomeByRole() {
    // Se pathname começa com /professor → ROUTES.prof.resumo
    if (loc.pathname.startsWith("/professor")) return ROUTES.prof.resumo;
    // Se começa com /aluno → ROUTES.aluno.resumo
    if (loc.pathname.startsWith("/aluno")) return ROUTES.aluno.resumo;
    // Senão → /
    return ROUTES.home;
  }

  function handleLogout() {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem("role");
      setAuthToken(undefined);
    } catch {}
    navigate(ROUTES.aluno.login, { replace: true });
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
              {NAV_ALUNO.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  onMouseEnter={() => prefetchRoute(i.to)}
                  className={({ isActive }) =>
                    [
                      "px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                      isActive ? "bg-orange-100 text-orange-700 font-semibold" : "text-gray-800 hover:bg-orange-50",
                      i.primary && !isActive ? "font-semibold" : "",
                    ].join(" ")
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden sm:flex items-center">
              <button
                onClick={handleLogout}
                className="ml-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-800 hover:bg-orange-50"
              >
                Sair
              </button>
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

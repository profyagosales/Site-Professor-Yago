import { NavLink, Link, useLocation } from "react-router-dom";

function getRole(): "teacher" | "student" | "guest" {
  return (localStorage.getItem("role") as any) || "guest";
}

const NAV_TEACHER = [
  { label: "Turmas", to: "/professor/turmas" },
  { label: "Notas da Classe", to: "/professor/notas-da-classe" },
  { label: "Caderno", to: "/professor/caderno" },
  { label: "Gabarito", to: "/professor/gabarito" },
  { label: "Redação", to: "/professor/redacao" },
];

const NAV_STUDENT = [
  { label: "Minhas Notas", to: "/aluno/notas" },
  { label: "Caderno", to: "/aluno/caderno" },
  { label: "Gabarito", to: "/aluno/gabaritos" },
  { label: "Redação", to: "/aluno/redacoes" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const role = getRole();
  const nav = role === "teacher" ? NAV_TEACHER : role === "student" ? NAV_STUDENT : [];
  const hideNav = ["/login-professor", "/login-aluno"].includes(loc.pathname);

  return (
    <div className="min-h-screen text-ys-ink">
      {!hideNav && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ys-line">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ys-amber text-white font-black">
                YS
              </span>
              <span className="font-semibold text-ys-ink">Professor Yago</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {nav.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) =>
                    [
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      "text-ys-ink-2 hover:text-ys-ink hover:bg-ys-bg",
                      isActive && "bg-ys-ink text-white hover:bg-ys-ink",
                    ].join(" ")
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
      )}

      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

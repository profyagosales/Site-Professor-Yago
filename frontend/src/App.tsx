import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Suspense, lazy } from "react";
import RequireAuth from "./routes/RequireAuth";
import { ROUTES } from "./routes";

const Landing = lazy(() => import("@/pages/Landing"));
const Turmas = lazy(() => import("@/pages/professor/Turmas"));
const TurmaAlunos = lazy(() => import("@/pages/professor/TurmaAlunos"));
const RedacoesProf = lazy(() => import("@/pages/redacao/DashboardRedacoes"));
const Resumo = lazy(() => import("@/pages/DashboardProfessor"));
const DashboardAluno = lazy(() => import("@/pages/DashboardAluno"));
const LoginProf = lazy(() => import("@/pages/auth/LoginProfessor"));
const LoginAluno = lazy(() => import("@/pages/auth/LoginAluno"));
const AlunoNotas = lazy(() => import("@/pages/aluno/Notas"));
const AlunoCaderno = lazy(() => import("@/pages/aluno/Caderno"));
const AlunoGabarito = lazy(() => import("@/pages/aluno/Gabarito"));
const AlunoRedacoes = lazy(() => import("@/pages/aluno/Redacoes"));
const GradeWorkspace = lazy(() => import("@/pages/professor/redacao/GradeWorkspace"));

export default function App() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 text-ys-ink-2">Carregando…</div>}>
      <Routes>
        <Route path={ROUTES.home} element={<Landing />} />
        <Route path={ROUTES.loginProfessor} element={<LoginProf />} />
        <Route path="/login-aluno" element={<LoginAluno />} />

        <Route path={ROUTES.prof.base} element={<RequireAuth />}>
          <Route index element={<Navigate to={ROUTES.prof.resumo} replace />} />
          <Route
            path="resumo"
            element={<AppShell><Resumo /></AppShell>}
          />
          <Route
            path="turmas"
            element={<AppShell><Turmas /></AppShell>}
          />
          <Route
            path="turmas/:id/alunos"
            element={<AppShell><TurmaAlunos /></AppShell>}
          />
          <Route
            path="notas-da-classe"
            element={<AppShell><RedacoesProf /></AppShell>} // placeholder caso exista outra página
          />
          <Route
            path="caderno"
            element={<AppShell><div className="p-6">Caderno</div></AppShell>} // manter estrutura
          />
          <Route
            path="gabarito"
            element={<AppShell><div className="p-6">Gabarito</div></AppShell>}
          />
          <Route
            path="redacao"
            element={<AppShell><RedacoesProf /></AppShell>}
          />
          <Route
            path="redacao/:id"
            element={<AppShell><GradeWorkspace /></AppShell>}
          />
        </Route>

        {/* Rotas do aluno mantidas */}
        <Route path="/aluno/dashboard" element={<RequireAuth />}>
          <Route index element={<AppShell><DashboardAluno /></AppShell>} />
        </Route>
        <Route path="/aluno/notas" element={<RequireAuth />}>
          <Route index element={<AppShell><AlunoNotas /></AppShell>} />
        </Route>
        <Route path="/aluno/caderno" element={<RequireAuth />}>
          <Route index element={<AppShell><AlunoCaderno /></AppShell>} />
        </Route>
        <Route path="/aluno/gabarito" element={<RequireAuth />}>
          <Route index element={<AppShell><AlunoGabarito /></AppShell>} />
        </Route>
        <Route path="/aluno/redacoes" element={<RequireAuth />}>
          <Route index element={<AppShell><AlunoRedacoes /></AppShell>} />
        </Route>

        {/* fallback SPA */}
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </Suspense>
  );
}

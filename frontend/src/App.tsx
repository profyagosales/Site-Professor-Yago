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
        {/* públicas */}
        <Route path={ROUTES.home} element={<Landing />} />
        <Route path={ROUTES.auth.loginProf} element={<LoginProf />} />
        <Route path={ROUTES.auth.loginAluno} element={<LoginAluno />} />

        {/* área professor - FILHOS COM PATH RELATIVO */}
        <Route
          path={ROUTES.prof.base}
          element={
            <RequireAuth userType="professor">
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="resumo" replace />} />
          <Route path="resumo" element={<Resumo />} />
          <Route path="turmas" element={<Turmas />} />
          <Route path="turmas/:id/alunos" element={<TurmaAlunos />} />
          <Route path="notas-da-classe" element={<RedacoesProf />} />
          <Route path="caderno" element={<div className="p-6">Caderno</div>} />
          <Route path="gabarito" element={<div className="p-6">Gabarito</div>} />
          <Route path="redacao" element={<RedacoesProf />} />
          <Route path="redacao/:id" element={<GradeWorkspace />} />
        </Route>

        {/* área aluno - FILHOS COM PATH RELATIVO */}
        <Route
          path={ROUTES.aluno.base}
          element={
            <RequireAuth userType="aluno">
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="resumo" replace />} />
          <Route path="resumo" element={<DashboardAluno />} />
          <Route path="notas" element={<AlunoNotas />} />
          <Route path="recados" element={<div className="p-6">Recados</div>} />
          <Route path="redacao" element={<AlunoRedacoes />} />
          <Route path="caderno" element={<AlunoCaderno />} />
          <Route path="gabaritos" element={<AlunoGabarito />} />
          <Route path="redacoes" element={<AlunoRedacoes />} />
        </Route>

        {/* fallback por último */}
        <Route path={ROUTES.notFound} element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </Suspense>
  );
}

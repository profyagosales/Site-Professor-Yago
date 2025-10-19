import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./routes/ProtectedRoute";

const Landing = lazy(() => import("@/pages/Landing"));
const Turmas = lazy(() => import("@/pages/professor/Turmas"));
const TurmaAlunos = lazy(() => import("@/pages/professor/TurmaAlunos"));
const TurmaPage = lazy(() => import("@/pages/professor/turma/TurmaPage"));
const RedacoesProf = lazy(() => import("@/pages/redacao/DashboardRedacoes"));
// @ts-expect-error legacy JSX module
const DashboardProfessor = lazy(() => import("@/pages/DashboardProfessor"));
// @ts-expect-error legacy JSX module
const DashboardAluno = lazy(() => import("@/pages/DashboardAluno"));
const LoginProf = lazy(() => import("@/pages/auth/LoginProfessor"));
const LoginAluno = lazy(() => import("@/pages/auth/LoginAluno"));
const AlunoNotas = lazy(() => import("@/pages/aluno/Notas"));
const AlunoRedacoes = lazy(() => import("@/pages/aluno/Redacoes"));

export default function App() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 text-ys-ink-2">Carregando…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login-professor" element={<LoginProf />} />
        <Route path="/login-aluno" element={<LoginAluno />} />

        <Route
          path="/professor/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardProfessor />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/classes"
          element={
            <ProtectedRoute>
              <AppShell>
                <Turmas />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/classes/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <TurmaPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/classes/:id/alunos"
          element={
            <ProtectedRoute>
              <AppShell>
                <TurmaAlunos />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-redacoes"
          element={
            <ProtectedRoute>
              <AppShell>
                <RedacoesProf />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/aluno/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardAluno />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/aluno/notas"
          element={
            <ProtectedRoute>
              <AppShell>
                <AlunoNotas />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/aluno/redacoes"
          element={
            <ProtectedRoute>
              <AppShell>
                <AlunoRedacoes />
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

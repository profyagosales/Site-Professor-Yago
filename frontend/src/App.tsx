import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Suspense, lazy } from "react";

const Landing = lazy(() => import("@/pages/Landing"));
const Turmas = lazy(() => import("@/pages/professor/Turmas"));
const TurmaAlunos = lazy(() => import("@/pages/professor/TurmaAlunos"));
const RedacoesProf = lazy(() => import("@/pages/redacao/DashboardRedacoes"));
const LoginProf = lazy(() => import("@/pages/auth/LoginProfessor"));
const LoginAluno = lazy(() => import("@/pages/auth/LoginAluno"));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 text-ys-ink-2">Carregando…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login-professor" element={<LoginProf />} />
          <Route path="/login-aluno" element={<LoginAluno />} />

          <Route path="/turmas" element={<Turmas />} />
          <Route path="/turmas/:id/alunos" element={<TurmaAlunos />} />
          <Route path="/dashboard-redacoes" element={<RedacoesProf />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

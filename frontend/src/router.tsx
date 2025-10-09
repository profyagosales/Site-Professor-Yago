import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AppShellLayout from '@/layouts/AppShellLayout';
import PrivateRoute from '@/routes/PrivateRoute';
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/auth/LoginProfessor';
import LoginAluno from '@/pages/auth/LoginAluno';
import DashboardProfessor from '@/pages/DashboardProfessor';
import DashboardAluno from '@/pages/DashboardAluno';
import { lazy, Suspense } from 'react';
const RedacaoProfessorPage = lazy(() => import(/* @vite-ignore */ '@/pages/professor/redacao/RedacaoProfessorPage'));
const GradeWorkspace = lazy(() => import(/* @vite-ignore */ '@/pages/professor/redacao/GradeWorkspace'));
import NotFound from '@/pages/NotFound';
import TurmasPage from '@/pages/professor/Turmas';
import NotasDaClasse from '@/pages/professor/NotasDaClasse';
import CadernoProf from '@/pages/professor/Caderno';
import GabaritoProf from '@/pages/professor/Gabarito';
import TurmaAlunosPage from '@/pages/professor/TurmaAlunos';
import ListaAlunos from '@/pages/professor/alunos/ListaAlunos';
import PerfilAluno from '@/pages/professor/alunos/PerfilAluno';
import AlunoCaderno from '@/pages/aluno/Caderno';
import AlunoGabarito from '@/pages/aluno/Gabarito';
import AlunoRedacoes from '@/pages/aluno/Redacoes';
import AlunoNotas from '@/pages/aluno/Notas';
// Opcional: console de telemetria em dev/admin (só monta quando VITE_FEATURE_TELEMETRY_VIEW=1)
const DevTelemetryConsole = lazy(() => import(/* @vite-ignore */ '@/pages/DevTelemetryConsole'));

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login-professor', element: <LoginProfessor /> },
      { path: '/login-aluno', element: <LoginAluno /> },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          // Página principal do professor: Resumo
          { path: '/professor', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/professor/resumo', element: <DashboardProfessor /> },
          // Compat: rotas antigas/curtas
          { path: '/dashboard', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/professor/dashboard', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/turmas', element: <Navigate to="/professor/turmas" replace /> },
          { path: '/caderno', element: <Navigate to="/professor/caderno" replace /> },
          { path: '/gabarito', element: <Navigate to="/professor/gabarito" replace /> },
          { path: '/notas-da-classe', element: <Navigate to="/professor/notas-da-classe" replace /> },
          { path: '/redacao', element: <Navigate to="/professor/redacao" replace /> },
          { path: '/professor/turmas', element: <TurmasPage /> },
          { path: '/professor/turmas/:id/alunos', element: <TurmaAlunosPage /> },
          { path: '/professor/notas-da-classe', element: <NotasDaClasse /> },
          { path: '/professor/caderno', element: <CadernoProf /> },
          { path: '/professor/gabarito', element: <GabaritoProf /> },
          { path: '/professor/redacao', element: <Suspense fallback={<div className="p-6">Carregando…</div>}><RedacaoProfessorPage /></Suspense> },
          { path: '/professor/redacao/:id', element: <Suspense fallback={<div className="p-6">Carregando…</div>}><GradeWorkspace /></Suspense> },
          { path: '/professor/alunos', element: <ListaAlunos /> },
          { path: '/professor/alunos/:id', element: <PerfilAluno /> },
          // Rota dev: console de telemetria (apenas se flag no frontend estiver ativa)
          { path: '/dev/telemetry', element: <Suspense fallback={<div className="p-6">Carregando…</div>}><DevTelemetryConsole /></Suspense> },
        ],
      },
      {
        element: <AppShellLayout />,
        children: [
          { path: '/aluno', element: <Navigate to="/aluno/caderno" replace /> },
          { path: '/aluno/dashboard', element: <DashboardAluno /> },
          { path: '/aluno/caderno', element: <AlunoCaderno /> },
          { path: '/aluno/gabaritos', element: <AlunoGabarito /> },
          { path: '/aluno/redacoes', element: <AlunoRedacoes /> },
          { path: '/aluno/notas', element: <AlunoNotas /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AppShellLayout from '@/layouts/AppShellLayout';
import AlunoShell from '@/layouts/AlunoShell';
import RequireAuth from '@/routes/RequireAuth';
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/auth/LoginProfessor';
import LoginAluno from '@/pages/auth/LoginAluno';
import DashboardProfessor from '@/pages/DashboardProfessor';
import DashboardAluno from '@/pages/DashboardAluno';
import { lazy, Suspense } from 'react';
const RedacaoProfessorPage = lazy(
  () => import('@/pages/professor/redacao/RedacaoProfessorPage')
);
const GradeWorkspace = lazy(
  () => import('@/pages/professor/redacao/GradeWorkspace')
);
import NotFound from '@/pages/NotFound';
import TurmasPage from '@/pages/professor/Turmas';
import NotasDaClasse from '@/pages/professor/NotasDaClasse';
import CadernoProf from '@/pages/professor/Caderno';
import GabaritoProf from '@/pages/professor/Gabarito';
import TurmaAlunosPage from '@/pages/professor/TurmaAlunos';
import ListaAlunos from '@/pages/professor/alunos/ListaAlunos';
import PerfilAluno from '@/pages/professor/alunos/PerfilAluno';
import AlunoRedacoes from '@/pages/aluno/Redacoes';
import AlunoNotas from '@/pages/aluno/Notas';
import { ROUTES } from '@/routes';
import { validateAndReportRoutes } from '@/routes/validateRoutes';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: <Landing /> },
      { path: ROUTES.auth.loginProf, element: <LoginProfessor /> },
      { path: ROUTES.aluno.login, element: <LoginAluno /> },
    ],
  },
  {
    path: ROUTES.prof.root,
    element: <AppShellLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          // /professor → resumo (rota index)
          { index: true, element: <DashboardProfessor /> },

          // Filhas com caminhos relativos
          { path: 'resumo', element: <DashboardProfessor /> },
          { path: 'turmas', element: <TurmasPage /> },
          { path: 'turmas/:id/alunos', element: <TurmaAlunosPage /> },
          { path: 'notas-da-classe', element: <NotasDaClasse /> },
          { path: 'caderno', element: <CadernoProf /> },
          { path: 'gabarito', element: <GabaritoProf /> },
          {
            path: 'redacao',
            element: (
              <Suspense fallback={<div className='p-6'>Carregando…</div>}>
                <RedacaoProfessorPage />
              </Suspense>
            ),
          },
          {
            path: 'redacao/:id',
            element: (
              <Suspense fallback={<div className='p-6'>Carregando…</div>}>
                <GradeWorkspace />
              </Suspense>
            ),
          },
          { path: 'alunos', element: <ListaAlunos /> },
          { path: 'alunos/:id', element: <PerfilAluno /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.aluno.base,
    element: <AlunoShell />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            index: true,
            element: <Navigate to={ROUTES.aluno.resumo} replace />,
          },
          { path: 'resumo', element: <DashboardAluno /> },
          { path: 'notas', element: <AlunoNotas /> },
          {
            path: 'recados',
            element: <div className='p-6'>Recados - Em desenvolvimento</div>,
          },
          { path: 'redacao', element: <AlunoRedacoes /> },
        ],
      },
    ],
  },
  // Aliases legados úteis (fora do grupo professor) - mantidos para compatibilidade
  { path: '/dashboard', element: <Navigate to={ROUTES.prof.resumo} replace /> },
  {
    path: '/professor/dashboard',
    element: <Navigate to={ROUTES.prof.resumo} replace />,
  },
  { path: '/turmas', element: <Navigate to={ROUTES.prof.turmas} replace /> },
  { path: '/caderno', element: <Navigate to={ROUTES.prof.caderno} replace /> },
  {
    path: '/gabarito',
    element: <Navigate to={ROUTES.prof.gabarito} replace />,
  },
  {
    path: '/notas-da-classe',
    element: <Navigate to={ROUTES.prof.notasClasse} replace />,
  },
  { path: '/redacao', element: <Navigate to={ROUTES.prof.redacao} replace /> },
  { path: ROUTES.notFound, element: <NotFound /> },
]);

// Validar rotas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  validateAndReportRoutes(router.routes);
}

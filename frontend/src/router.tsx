import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ROUTES } from '@/routes';
import { validateAndReportRoutes } from '@/routes/validateRoutes';

// Layouts - carregamento imediato (críticos)
import PublicLayout from '@/layouts/PublicLayout';
import AppShellLayout from '@/layouts/AppShellLayout';
import AlunoShell from '@/layouts/AlunoShell';
import RequireAuth from '@/routes/RequireAuth';

// Páginas críticas - carregamento imediato
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/auth/LoginProfessor';
import LoginAluno from '@/pages/auth/LoginAluno';
import NotFound from '@/pages/NotFound';

// Páginas principais - lazy loading
const DashboardProfessor = lazy(() => import('@/pages/DashboardProfessor'));
const DashboardAluno = lazy(() => import('@/pages/DashboardAluno'));

// Páginas professor - lazy loading
const TurmasPage = lazy(() => import('@/pages/professor/Turmas'));
const NotasDaClasse = lazy(() => import('@/pages/professor/NotasDaClasse'));
const CadernoProf = lazy(() => import('@/pages/professor/Caderno'));
const GabaritoProf = lazy(() => import('@/pages/professor/Gabarito'));
const TurmaAlunosPage = lazy(() => import('@/pages/professor/TurmaAlunos'));
const ListaAlunos = lazy(() => import('@/pages/professor/alunos/ListaAlunos'));
const PerfilAluno = lazy(() => import('@/pages/professor/alunos/PerfilAluno'));

// Páginas aluno - lazy loading
const AlunoRedacoes = lazy(() => import('@/pages/aluno/Redacoes'));
const AlunoNotas = lazy(() => import('@/pages/aluno/Notas'));
const AlunoCaderno = lazy(() => import('@/pages/aluno/Caderno'));
const RecadosAluno = lazy(() => import('@/pages/aluno/RecadosAluno'));
const AlunoGabarito = lazy(() => import('@/pages/aluno/Gabarito'));

// Páginas pesadas - lazy loading com preload
const RedacaoProfessorPage = lazy(
  () => import('@/pages/professor/redacao/RedacaoProfessorPage')
);
const GradeWorkspace = lazy(
  () => import('@/pages/professor/redacao/GradeWorkspace')
);

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
          {
            index: true,
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando dashboard...
                  </div>
                }
              >
                <DashboardProfessor />
              </Suspense>
            ),
          },

          // Filhas com caminhos relativos
          {
            path: 'resumo',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando dashboard...
                  </div>
                }
              >
                <DashboardProfessor />
              </Suspense>
            ),
          },
          {
            path: 'turmas',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando turmas...</div>
                }
              >
                <TurmasPage />
              </Suspense>
            ),
          },
          {
            path: 'turmas/:id/alunos',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando alunos...</div>
                }
              >
                <TurmaAlunosPage />
              </Suspense>
            ),
          },
          {
            path: 'turmas/:id/caderno',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando caderno...</div>
                }
              >
                <CadernoProf />
              </Suspense>
            ),
          },
          {
            path: 'notas-da-classe',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando notas...</div>
                }
              >
                <NotasDaClasse />
              </Suspense>
            ),
          },
          {
            path: 'caderno',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando caderno...</div>
                }
              >
                <CadernoProf />
              </Suspense>
            ),
          },
          {
            path: 'gabarito',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando gabarito...
                  </div>
                }
              >
                <GabaritoProf />
              </Suspense>
            ),
          },
          {
            path: 'redacao',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando redações...
                  </div>
                }
              >
                <RedacaoProfessorPage />
              </Suspense>
            ),
          },
          {
            path: 'redacao/:id',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando correção...
                  </div>
                }
              >
                <GradeWorkspace />
              </Suspense>
            ),
          },
          {
            path: 'alunos',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando alunos...</div>
                }
              >
                <ListaAlunos />
              </Suspense>
            ),
          },
          {
            path: 'alunos/:id',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando perfil...</div>
                }
              >
                <PerfilAluno />
              </Suspense>
            ),
          },
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
          {
            path: 'resumo',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando dashboard...
                  </div>
                }
              >
                <DashboardAluno />
              </Suspense>
            ),
          },
          {
            path: 'notas',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando notas...</div>
                }
              >
                <AlunoNotas />
              </Suspense>
            ),
          },
          {
            path: 'recados',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando recados...</div>
                }
              >
                <RecadosAluno />
              </Suspense>
            ),
          },
          {
            path: 'caderno',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando caderno...</div>
                }
              >
                <AlunoCaderno />
              </Suspense>
            ),
          },
          {
            path: 'gabaritos',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>Carregando gabaritos...</div>
                }
              >
                <AlunoGabarito />
              </Suspense>
            ),
          },
          {
            path: 'redacao',
            element: (
              <Suspense
                fallback={
                  <div className='p-6 animate-pulse'>
                    Carregando redações...
                  </div>
                }
              >
                <AlunoRedacoes />
              </Suspense>
            ),
          },
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

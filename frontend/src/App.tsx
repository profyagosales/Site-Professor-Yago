import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import AlunoShell from '@/layouts/AlunoShell';
import { Suspense, lazy } from 'react';
import RequireAuth from './routes/RequireAuth';
import { ROUTES } from './routes';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import FormSkeleton from '@/components/skeletons/FormSkeleton';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import NetworkBanner from '@/components/NetworkBanner';
import ErrorTestButton from '@/components/ErrorTestButton';
import { LoggerDebug } from '@/components/LoggerDebug';

// Rotas públicas - carregamento imediato
const Landing = lazy(() => import('@/pages/Landing'));
const LoginProf = lazy(() => import('@/pages/auth/LoginProfessor'));
const LoginAluno = lazy(() => import('@/pages/auth/LoginAluno'));

// Rotas professor - code-splitting
const Turmas = lazy(() => import('@/pages/professor/Turmas'));
const TurmaAlunos = lazy(() => import('@/pages/professor/TurmaAlunos'));
const RedacoesProf = lazy(() => import('@/pages/redacao/DashboardRedacoes'));
const Resumo = lazy(() => import('@/pages/DashboardProfessor'));
const GradeWorkspace = lazy(
  () => import('@/pages/professor/redacao/GradeWorkspace')
);

// Rotas aluno - code-splitting
const DashboardAluno = lazy(() => import('@/pages/DashboardAluno'));
const AlunoNotas = lazy(() => import('@/pages/aluno/Notas'));
const AlunoCaderno = lazy(() => import('@/pages/aluno/Caderno'));
const AlunoGabarito = lazy(() => import('@/pages/aluno/Gabarito'));
const AlunoRedacoes = lazy(() => import('@/pages/aluno/Redacoes'));

export default function App() {
  return (
    <AppErrorBoundary>
      <NetworkBanner />
      <ErrorTestButton />
      <LoggerDebug />
      <Routes>
        {/* Rotas públicas - sem Suspense para carregamento imediato */}
        <Route path={ROUTES.home} element={<Landing />} />
        <Route path={ROUTES.auth.loginProf} element={<LoginProf />} />
        <Route path={ROUTES.aluno.login} element={<LoginAluno />} />

        {/* área professor - com Suspense e skeletons específicos */}
        <Route
          path={ROUTES.prof.base}
          element={
            <RequireAuth userType='professor'>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to='resumo' replace />} />
          <Route
            path='resumo'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <Resumo />
              </Suspense>
            }
          />
          <Route
            path='turmas'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <Turmas />
              </Suspense>
            }
          />
          <Route
            path='turmas/:id/alunos'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <TurmaAlunos />
              </Suspense>
            }
          />
          <Route
            path='notas-da-classe'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <RedacoesProf />
              </Suspense>
            }
          />
          <Route path='caderno' element={<div className='p-6'>Caderno</div>} />
          <Route
            path='gabarito'
            element={<div className='p-6'>Gabarito</div>}
          />
          <Route
            path='redacao'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <RedacoesProf />
              </Suspense>
            }
          />
          <Route
            path='redacao/:id'
            element={
              <Suspense fallback={<FormSkeleton />}>
                <GradeWorkspace />
              </Suspense>
            }
          />
        </Route>

        {/* área aluno - com Suspense e skeletons específicos */}
        <Route
          path={ROUTES.aluno.base}
          element={
            <RequireAuth userType='aluno'>
              <AlunoShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to='resumo' replace />} />
          <Route
            path='resumo'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <DashboardAluno />
              </Suspense>
            }
          />
          <Route
            path='notas'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <AlunoNotas />
              </Suspense>
            }
          />
          <Route path='recados' element={<div className='p-6'>Recados</div>} />
          <Route
            path='redacao'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <AlunoRedacoes />
              </Suspense>
            }
          />
          <Route
            path='caderno'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AlunoCaderno />
              </Suspense>
            }
          />
          <Route
            path='gabaritos'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <AlunoGabarito />
              </Suspense>
            }
          />
          <Route
            path='redacoes'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <AlunoRedacoes />
              </Suspense>
            }
          />
        </Route>

        {/* fallback por último */}
        <Route
          path={ROUTES.notFound}
          element={<Navigate to={ROUTES.home} replace />}
        />
      </Routes>
    </AppErrorBoundary>
  );
}

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
import { FlagsDebug, useFlagsDebug } from '@/components/FlagsDebug';
import { useFlagsShortcut } from '@/hooks/useFlagsShortcut';
import { useVitals } from '@/hooks/useVitals';
import RevalidationDebugger from '@/components/RevalidationDebugger';

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
const NotasDaClasse = lazy(() => import('@/pages/professor/NotasDaClasse'));
const CadernoProf = lazy(() => import('@/pages/professor/Caderno'));
const GabaritoProf = lazy(() => import('@/pages/professor/Gabarito'));
const ListaAlunos = lazy(() => import('@/pages/professor/alunos/ListaAlunos'));
const PerfilAluno = lazy(() => import('@/pages/professor/alunos/PerfilAluno'));

// Rotas aluno - code-splitting
const DashboardAluno = lazy(() => import('@/pages/DashboardAluno'));
const AlunoNotas = lazy(() => import('@/pages/aluno/Notas'));
const AlunoCaderno = lazy(() => import('@/pages/aluno/Caderno'));
const AlunoGabarito = lazy(() => import('@/pages/aluno/Gabarito'));
const AlunoRedacoes = lazy(() => import('@/pages/aluno/Redacoes'));
const RecadosAluno = lazy(() => import('@/pages/aluno/RecadosAluno'));

export default function App() {
  const { isOpen, open, close } = useFlagsDebug();

  // Atalho Ctrl+Alt+F para abrir painel de flags
  useFlagsShortcut({ onToggle: open });

  // Sistema de Web Vitals (apenas em DEV ou com debug=1)
  useVitals({
    debug: process.env.NODE_ENV === 'development',
    consoleLog: true,
    showReportOnInit: process.env.NODE_ENV === 'development',
    analytics: false, // Desabilitado por enquanto
  });

  return (
    <AppErrorBoundary>
      <NetworkBanner />
      <ErrorTestButton />
      <LoggerDebug />
      <FlagsDebug isOpen={isOpen} onClose={close} />
      <RevalidationDebugger />
      <Routes>
        {/* Rotas públicas - sem Suspense para carregamento imediato */}
        <Route path={ROUTES.home} element={<Landing />} />
        <Route path={ROUTES.auth.loginProf} element={<LoginProf />} />
        <Route path={ROUTES.aluno.login} element={<LoginAluno />} />
        
        {/* Redirecionamentos para rotas antigas */}
        <Route path="/professor/login" element={<Navigate to={ROUTES.auth.loginProf} replace />} />
        <Route path="/aluno/login" element={<Navigate to={ROUTES.aluno.login} replace />} />

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
                <NotasDaClasse />
              </Suspense>
            }
          />
          <Route
            path='caderno'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <CadernoProf />
              </Suspense>
            }
          />
          <Route
            path='gabarito'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <GabaritoProf />
              </Suspense>
            }
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
          <Route
            path='alunos'
            element={
              <Suspense fallback={<TableSkeleton />}>
                <ListaAlunos />
              </Suspense>
            }
          />
          <Route
            path='alunos/:id'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <PerfilAluno />
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
          <Route
            path='recados'
            element={
              <Suspense fallback={<PageSkeleton />}>
                <RecadosAluno />
              </Suspense>
            }
          />
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

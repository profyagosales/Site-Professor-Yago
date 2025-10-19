import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AppShellLayout from '@/layouts/AppShellLayout';
import StudentLayout from '@/layouts/StudentLayout';
import PrivateRoute from '@/routes/PrivateRoute';
import TeacherGuard from '@/routes/TeacherGuard';
import GerencialGuard from '@/routes/GerencialGuard';
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/auth/LoginProfessor';
import LoginAluno from '@/pages/auth/LoginAluno';
import LoginGerencial from '@/pages/gerencial/LoginGerencial';
// @ts-expect-error legacy JSX module
import DashboardProfessor from '@/pages/DashboardProfessor';
import ResumoAlunoPage from '@/pages/aluno/Resumo';
import PasUnbPage from '@/pages/PasUnb';
import { lazy, Suspense } from 'react';
import GerencialLayout from '@/layouts/GerencialLayout';
import GerencialTeachersPage from '@/pages/gerencial/GerencialTeachersPage';
import StudentGuard from '@/routes/StudentGuard';
const RedacaoProfessorPage = lazy(() => import(/* @vite-ignore */ '@/pages/professor/redacao/RedacaoProfessorPage'));
const GradeWorkspace = lazy(() => import(/* @vite-ignore */ '@/pages/professor/redacao/GradeWorkspace'));
import NotFound from '@/pages/NotFound';
import TurmaAlunosPage from '@/pages/professor/TurmaAlunos';
import ClassesPage from '@/pages/professor/classes';
import ClassDetailPage from '@/pages/professor/classes/[id]';
import ClassGradesPage from '@/pages/professor/classes/[id]/grades';
import StudentProfilePage, {
  StudentEmailTab,
  StudentEssaysTab,
  StudentGradesTab,
  StudentNotesTab,
} from '@/pages/professor/classes/[classId]/students/[studentId]';
import ListaAlunos from '@/pages/professor/alunos/ListaAlunos';
import PerfilAluno from '@/pages/professor/alunos/PerfilAluno';
import AlunoRedacoes from '@/pages/aluno/Redacoes';
import AlunoNotas from '@/pages/aluno/Notas';
import ConteudosPage from '@/pages/professor/Conteudos';
// Opcional: console de telemetria em dev/admin (só monta quando VITE_FEATURE_TELEMETRY_VIEW=1)
const DevTelemetryConsole = lazy(() => import(/* @vite-ignore */ '@/pages/DevTelemetryConsole'));

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login-professor', element: <LoginProfessor /> },
      { path: '/login-aluno', element: <LoginAluno /> },
      { path: '/gerencial/login', element: <LoginGerencial /> },
    ],
  },
  {
    path: '/gerencial',
    element: (
      <GerencialGuard>
        <GerencialLayout />
      </GerencialGuard>
    ),
    children: [{ index: true, element: <GerencialTeachersPage /> }],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          // Página principal do professor: Resumo
          { path: '/professor', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/professor/resumo', element: <TeacherGuard><DashboardProfessor /></TeacherGuard> },
          { path: '/professor/pas-unb', element: <Navigate to="/pas" replace /> },
          // Compat: rotas antigas/curtas
          { path: '/dashboard', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/professor/dashboard', element: <Navigate to="/professor/resumo" replace /> },
          { path: '/turmas', element: <Navigate to="/professor/classes" replace /> },
          { path: '/redacao', element: <Navigate to="/professor/redacao" replace /> },
          { path: '/professor/classes', element: <TeacherGuard><ClassesPage /></TeacherGuard> },
          { path: '/professor/conteudos', element: <TeacherGuard><ConteudosPage /></TeacherGuard> },
          { path: '/professor/classes/:id', element: <TeacherGuard><ClassDetailPage /></TeacherGuard> },
          { path: '/professor/classes/:id/grades', element: <TeacherGuard><ClassGradesPage /></TeacherGuard> },
          {
            path: '/professor/classes/:classId/students/:studentId',
            element: <TeacherGuard><StudentProfilePage /></TeacherGuard>,
            children: [
              { index: true, element: <StudentGradesTab /> },
              { path: 'essays', element: <StudentEssaysTab /> },
              { path: 'notes', element: <StudentNotesTab /> },
              { path: 'email', element: <StudentEmailTab /> },
            ],
          },
          { path: '/professor/classes/:id/alunos', element: <TeacherGuard><TurmaAlunosPage /></TeacherGuard> },
          { path: '/professor/redacao', element: <TeacherGuard><Suspense fallback={<div className="p-6">Carregando…</div>}><RedacaoProfessorPage /></Suspense></TeacherGuard> },
          { path: '/professor/redacao/:id', element: <TeacherGuard><Suspense fallback={<div className="p-6">Carregando…</div>}><GradeWorkspace /></Suspense></TeacherGuard> },
          { path: '/professor/alunos', element: <TeacherGuard><ListaAlunos /></TeacherGuard> },
          { path: '/professor/alunos/:id', element: <TeacherGuard><PerfilAluno /></TeacherGuard> },
          // Rota dev: console de telemetria (apenas se flag no frontend estiver ativa)
          { path: '/dev/telemetry', element: <TeacherGuard><Suspense fallback={<div className="p-6">Carregando…</div>}><DevTelemetryConsole /></Suspense></TeacherGuard> },
        ],
      },
      {
        element: <AppShellLayout />,
        children: [
          {
            element: (
              <StudentGuard>
                <StudentLayout />
              </StudentGuard>
            ),
            children: [
              { path: '/aluno', element: <Navigate to="/aluno/resumo" replace /> },
              { path: '/aluno/resumo', element: <ResumoAlunoPage /> },
              { path: '/aluno/dashboard', element: <Navigate to="/aluno/resumo" replace /> },
              { path: '/aluno/redacoes', element: <AlunoRedacoes /> },
              { path: '/aluno/notas', element: <AlunoNotas /> },
              { path: '/pas', element: <PasUnbPage /> },
              { path: '/aluno/pas-unb', element: <Navigate to="/pas" replace /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

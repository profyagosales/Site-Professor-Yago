import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AppShellLayout from '@/layouts/AppShellLayout';
import PrivateRoute from '@/routes/PrivateRoute';
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/auth/LoginProfessor';
import LoginAluno from '@/pages/auth/LoginAluno';
import DashboardProfessor from '@/pages/DashboardProfessor';
import DashboardAluno from '@/pages/DashboardAluno';
import RedacaoProfessor from '@/pages/redacao/DashboardRedacoes';
import NotFound from '@/pages/NotFound';
import TurmasPage from '@/pages/professor/Turmas';
import NotasDaClasse from '@/pages/professor/NotasDaClasse';
import CadernoProf from '@/pages/professor/Caderno';
import GabaritoProf from '@/pages/professor/Gabarito';
import TurmaAlunosPage from '@/pages/professor/TurmaAlunos';
import AlunoCaderno from '@/pages/aluno/Caderno';
import AlunoGabarito from '@/pages/aluno/Gabarito';
import AlunoRedacoes from '@/pages/aluno/Redacoes';
import AlunoNotas from '@/pages/aluno/Notas';

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
          { path: '/professor', element: <Navigate to="/professor/turmas" replace /> },
          { path: '/professor/turmas', element: <TurmasPage /> },
          { path: '/professor/turmas/:id/alunos', element: <TurmaAlunosPage /> },
          { path: '/professor/notas-da-classe', element: <NotasDaClasse /> },
          { path: '/professor/caderno', element: <CadernoProf /> },
          { path: '/professor/gabarito', element: <GabaritoProf /> },
          { path: '/professor/redacao', element: <RedacaoProfessor /> },
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

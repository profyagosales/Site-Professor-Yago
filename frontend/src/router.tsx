import { createBrowserRouter } from 'react-router-dom';
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
          { path: '/professor/dashboard', element: <DashboardProfessor /> },
          { path: '/professor/redacao', element: <RedacaoProfessor /> },
        ],
      },
      {
        element: <AppShellLayout />,
        children: [
          { path: '/aluno/dashboard', element: <DashboardAluno /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

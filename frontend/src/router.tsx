import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import {
  HOME_PATH,
  LOGIN_ALUNO_PATH,
  LOGIN_PROFESSOR_PATH,
  LEGACY_ALIASES,
} from '@/routes/paths';

// Páginas reais com layout completo
import HomePage from '@/pages/Home';
import LoginAlunoPage from '@/pages/auth/LoginAluno';
import LoginProfessorPage from '@/pages/auth/LoginProfessor';

const aliasRoutes = Object.entries(LEGACY_ALIASES).map(([from, to]) => ({
  path: from.slice(1),
  element: <Navigate to={to} replace />,
}));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> }, // "/" pública
      { path: LOGIN_ALUNO_PATH.slice(1), element: <LoginAlunoPage /> },
      { path: LOGIN_PROFESSOR_PATH.slice(1), element: <LoginProfessorPage /> },

      // aliases antigos/errados → redirecionam para as slugs canônicas
      ...aliasRoutes,

      // fallback simples
      { path: '*', element: <Navigate to={HOME_PATH} replace /> },
    ],
  },
]);

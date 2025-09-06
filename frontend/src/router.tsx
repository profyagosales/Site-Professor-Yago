import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/HomePage'; // se não existir, crie um stub
import LoginAlunoPage from '@/pages/LoginAlunoPage';
import LoginProfessorPage from '@/pages/LoginProfessorPage';
import { HOME_PATH, LOGIN_ALUNO_PATH, LOGIN_PROFESSOR_PATH } from '@/routes/paths';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> }, // "/" é público
      { path: LOGIN_ALUNO_PATH.slice(1), element: <LoginAlunoPage /> },
      { path: LOGIN_PROFESSOR_PATH.slice(1), element: <LoginProfessorPage /> },
      // ...demais rotas protegidas
      { path: '*', element: <HomePage /> }
    ],
  },
]);

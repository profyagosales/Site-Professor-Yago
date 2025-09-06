import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { LoginAlunoPage } from './pages/LoginAlunoPage'
import { LoginProfessorPage } from './pages/LoginProfessorPage'
import { paths } from './routes/paths'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: paths.loginAluno,
        element: <LoginAlunoPage />,
      },
      {
        path: paths.loginProfessor,
        element: <LoginProfessorPage />,
      },
    ],
  },
])

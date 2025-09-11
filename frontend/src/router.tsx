import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { LoginAlunoPage } from './pages/LoginAlunoPage'
import { LoginProfessorPage } from './pages/LoginProfessorPage'
import { DashboardPage } from './pages/DashboardPage'
import { AuthErrorPage } from './pages/AuthErrorPage'
import { paths } from './routes/paths'
import { AuthGate } from './features/auth/AuthGate'

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
      {
        path: paths.dashboard,
        element: (
          <AuthGate requireAuth={true}>
            <DashboardPage />
          </AuthGate>
        ),
      },
      {
        path: paths.authError,
        element: <AuthErrorPage />,
      },
    ],
  },
])

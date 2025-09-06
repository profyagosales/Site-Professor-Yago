import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { LoginAlunoPage } from './pages/LoginAlunoPage'
import { LoginProfessorPage } from './pages/LoginProfessorPage'
import { DashboardPage } from './pages/DashboardPage'
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
        element: (
          <AuthGate requireAuth={false}>
            <LoginAlunoPage />
          </AuthGate>
        ),
      },
      {
        path: paths.loginProfessor,
        element: (
          <AuthGate requireAuth={false}>
            <LoginProfessorPage />
          </AuthGate>
        ),
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
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

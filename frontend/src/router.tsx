import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { LoginAlunoPage } from './pages/LoginAlunoPage'
import { LoginProfessorPage } from './pages/LoginProfessorPage'
import { DashboardPage } from './pages/DashboardPage'
import { AuthErrorPage } from './pages/AuthErrorPage'
import { GerenciarTemasPage } from './pages/GerenciarTemasPage'
import { RevisarRedacoesPage } from './pages/RevisarRedacoesPage'
import { GerenciarAlunosPage } from './pages/GerenciarAlunosPage'
import { NovaRedacaoPage } from './pages/NovaRedacaoPage'
import { MinhasRedacoesPage } from './pages/MinhasRedacoesPage'
import { VerTemasPage } from './pages/VerTemasPage'
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
      // Rotas do Professor (protegidas)
      {
        path: paths.gerenciarTemas,
        element: (
          <AuthGate requireAuth={true} roles={['teacher']}>
            <GerenciarTemasPage />
          </AuthGate>
        ),
      },
      {
        path: paths.revisarRedacoes,
        element: (
          <AuthGate requireAuth={true} roles={['teacher']}>
            <RevisarRedacoesPage />
          </AuthGate>
        ),
      },
      {
        path: paths.gerenciarAlunos,
        element: (
          <AuthGate requireAuth={true} roles={['teacher']}>
            <GerenciarAlunosPage />
          </AuthGate>
        ),
      },
      // Rotas do Aluno (protegidas)
      {
        path: paths.novaRedacao,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <NovaRedacaoPage />
          </AuthGate>
        ),
      },
      {
        path: paths.minhasRedacoes,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <MinhasRedacoesPage />
          </AuthGate>
        ),
      },
      {
        path: paths.verTemas,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <VerTemasPage />
          </AuthGate>
        ),
      },
    ],
  },
])

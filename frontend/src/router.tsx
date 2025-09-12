import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import React, { Suspense, lazy } from 'react'
import { HomePage } from './pages/HomePage'
import { LoginAlunoPage } from './pages/LoginAlunoPage'
import { LoginProfessorPage } from './pages/LoginProfessorPage'
import { DashboardPage } from './pages/DashboardPage'
import { AuthErrorPage } from './pages/AuthErrorPage'
const GerenciarTemasPage = lazy(() => import('./pages/GerenciarTemasPage').then(m => ({ default: m.GerenciarTemasPage })))
const RevisarRedacoesPage = lazy(() => import('./pages/RevisarRedacoesPage').then(m => ({ default: m.RevisarRedacoesPage })))
const CorrectionPage = lazy(() => import('./pages/CorrectionPage'))
const GerenciarAlunosPage = lazy(() => import('./pages/GerenciarAlunosPage').then(m => ({ default: m.GerenciarAlunosPage })))
const GerenciarTurmasPage = lazy(() => import('./pages/GerenciarTurmasPage'))
const NovaRedacaoPage = lazy(() => import('./pages/NovaRedacaoPage').then(m => ({ default: m.NovaRedacaoPage })))
const MinhasRedacoesPage = lazy(() => import('./pages/MinhasRedacoesPage').then(m => ({ default: m.MinhasRedacoesPage })))
const VerTemasPage = lazy(() => import('./pages/VerTemasPage').then(m => ({ default: m.VerTemasPage })))
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
            <Suspense fallback={<div>Carregando...</div>}><GerenciarTemasPage /></Suspense>
          </AuthGate>
        ),
      },
      {
        path: paths.revisarRedacoes,
  element: <Suspense fallback={<div>Carregando...</div>}><RevisarRedacoesPage /></Suspense>,
      },
      {
        path: paths.corrigirRedacao,
  element: <Suspense fallback={<div>Carregando PDF...</div>}><CorrectionPage /></Suspense>,
      },
      {
        path: paths.gerenciarAlunos,
        element: (
          <AuthGate requireAuth={true} roles={['teacher']}>
            <Suspense fallback={<div>Carregando...</div>}><GerenciarAlunosPage /></Suspense>
          </AuthGate>
        ),
      },
      {
        path: paths.gerenciarTurmas, // Adicionar a nova rota de turmas
        element: (
          <AuthGate requireAuth={true} roles={['teacher']}>
            <Suspense fallback={<div>Carregando...</div>}><GerenciarTurmasPage /></Suspense>
          </AuthGate>
        ),
      },
      // Rotas do Aluno (protegidas)
      {
        path: paths.novaRedacao,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <Suspense fallback={<div>Carregando...</div>}><NovaRedacaoPage /></Suspense>
          </AuthGate>
        ),
      },
      {
        path: paths.minhasRedacoes,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <Suspense fallback={<div>Carregando...</div>}><MinhasRedacoesPage /></Suspense>
          </AuthGate>
        ),
      },
      {
        path: paths.verTemas,
        element: (
          <AuthGate requireAuth={true} roles={['student']}>
            <Suspense fallback={<div>Carregando...</div>}><VerTemasPage /></Suspense>
          </AuthGate>
        ),
      },
    ],
  },
])

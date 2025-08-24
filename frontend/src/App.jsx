import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Landing from '@/pages/Landing';
import LoginProfessor from '@/pages/LoginProfessor';
import LoginAluno from '@/pages/LoginAluno';
import DashboardProfessor from '@/pages/DashboardProfessor';
import DashboardAluno from '@/pages/DashboardAluno';
import EnviarRedacao from '@/pages/EnviarRedacao';
import DashboardRedacoes from '@/pages/DashboardRedacoes';
import Turmas from '@/pages/Turmas';
import TurmaAlunos from '@/pages/TurmaAlunos';
import PerfilAlunoProfessor from '@/pages/PerfilAlunoProfessor';
import NotasClasse from '@/pages/NotasClasse';
import DetalhesNotaAluno from '@/pages/DetalhesNotaAluno';
import CadernoClasse from '@/pages/CadernoClasse';
import CriarGabarito from '@/pages/CriarGabarito';
import CorrigirGabaritos from '@/pages/CorrigirGabaritos';
import CorrigirRedacao from '@/pages/CorrigirRedacao';
import Conteudos from '@/pages/Conteudos';
import AppShell from '@/components/AppShell';
import { ToastContainer } from 'react-toastify';
import RequireAuth from '@/components/RequireAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import flags from "@/config/features";
const Redacao = lazy(() => import("@/pages/professor/redacao"));
const RedacaoWorkspace = lazy(() => import("@/pages/professor/redacao/Workspace"));

function getRole() {
  return localStorage.getItem('role');
}

function isAuthed() {
  return Boolean(localStorage.getItem('token'));
}

function AutoRedirectFromLanding() {
  const role = getRole();
  if (isAuthed() && role === 'teacher') return <Navigate to="/dashboard-professor" replace />;
  if (isAuthed() && role === 'student') return <Navigate to="/dashboard-aluno" replace />;
  return <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<AutoRedirectFromLanding />} />
          <Route path="/login-professor" element={<LoginProfessor />} />
          <Route path="/login-aluno" element={<LoginAluno />} />
          <Route
            path="/dashboard-professor"
            element={
              isAuthed() && getRole() === 'teacher' ? (
                <DashboardProfessor />
              ) : (
                <Navigate to="/login-professor" replace />
              )
            }
          />
          <Route
            path="/dashboard-aluno"
            element={
              isAuthed() && getRole() === 'student' ? (
                <DashboardAluno />
              ) : (
                <Navigate to="/login-aluno" replace />
              )
            }
          />
          <Route
            path="/dashboard-redacoes"
            element={
              <RequireAuth role="teacher">
                <DashboardRedacoes />
              </RequireAuth>
            }
          />
          {flags.redaction && (
            <>
              <Route
                path="/aluno/redacao"
                element={
                  <RequireAuth role="student">
                    <EnviarRedacao />
                  </RequireAuth>
                }
              />
              <Route
                path="/professor/redacao"
                element={
                  <RequireAuth role="teacher">
                    <Suspense fallback={<p>Carregando...</p>}>
                      <Redacao />
                    </Suspense>
                  </RequireAuth>
                }
              />
              <Route
                path="/professor/redacao/:id"
                element={
                  <RequireAuth role="teacher">
                    <Suspense fallback={<p>Carregando...</p>}>
                      <RedacaoWorkspace />
                    </Suspense>
                  </RequireAuth>
                }
              />
            </>
          )}
          <Route
            path="/turmas"
            element={
              <RequireAuth role="teacher">
                <Turmas />
              </RequireAuth>
            }
          />
          <Route
            path="/turmas/:classId/alunos"
            element={
              <RequireAuth role="teacher">
                <ErrorBoundary>
                  <TurmaAlunos />
                </ErrorBoundary>
              </RequireAuth>
            }
          />
          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <PerfilAlunoProfessor />
              </RequireAuth>
            }
          />
          <Route
            path="/notas-classe"
            element={
              <RequireAuth role="teacher">
                <NotasClasse />
              </RequireAuth>
            }
          />
          <Route
            path="/alunos/:id/notas"
            element={
              <RequireAuth role="teacher">
                <DetalhesNotaAluno />
              </RequireAuth>
            }
          />
          <Route
            path="/caderno-classe"
            element={
              <RequireAuth role="teacher">
                <CadernoClasse />
              </RequireAuth>
            }
          />
          <Route
            path="/criar-gabarito"
            element={
              <RequireAuth role="teacher">
                <CriarGabarito />
              </RequireAuth>
            }
          />
          <Route
            path="/corrigir-gabaritos"
            element={
              <RequireAuth role="teacher">
                <CorrigirGabaritos />
              </RequireAuth>
            }
          />
          {flags.redaction && (
            <Route
              path="/redacoes/:id/corrigir"
              element={
                <RequireAuth role="teacher">
                  <CorrigirRedacao />
                </RequireAuth>
              }
            />
          )}
          <Route path="/conteudos" element={<Conteudos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;

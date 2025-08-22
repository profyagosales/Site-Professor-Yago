import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import LoginProfessor from '@/pages/LoginProfessor';
import LoginAluno from '@/pages/LoginAluno';
import DashboardProfessor from '@/pages/DashboardProfessor';
import DashboardAluno from '@/pages/DashboardAluno';
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
import Header from '@/components/Header';
import { ToastContainer } from 'react-toastify';
import RequireAuth from '@/components/RequireAuth';

const HIDE_HEADER_ON = ['/', '/login-professor', '/login-aluno'];

function Layout({ children }) {
  const location = useLocation();
  const hideHeader = HIDE_HEADER_ON.includes(location.pathname);
  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}

function getRole() {
  return localStorage.getItem('role');
}

function isAuthed() {
  return Boolean(localStorage.getItem('token'));
}

function AutoRedirectFromHome() {
  const role = getRole();
  if (isAuthed() && role === 'teacher') return <Navigate to="/dashboard-professor" replace />;
  if (isAuthed() && role === 'student') return <Navigate to="/dashboard-aluno" replace />;
  return <Home />;
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<AutoRedirectFromHome />} />
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
          <Route
            path="/turmas"
            element={
              <RequireAuth role="teacher">
                <Turmas />
              </RequireAuth>
            }
          />
          <Route
            path="/turmas/:id/alunos"
            element={
              <RequireAuth role="teacher">
                <TurmaAlunos />
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
          <Route
            path="/redacoes/:id/corrigir"
            element={
              <RequireAuth role="teacher">
                <CorrigirRedacao />
              </RequireAuth>
            }
          />
          <Route path="/conteudos" element={<Conteudos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
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
import { ToastContainer } from 'react-toastify';
import RequireAuth from '@/components/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <div className="page-wrapper">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login-professor" element={<LoginProfessor />} />
          <Route path="/login-aluno" element={<LoginAluno />} />
          <Route
            path="/dashboard-professor"
            element={
              <RequireAuth role="teacher">
                <DashboardProfessor />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-aluno"
            element={
              <RequireAuth role="student">
                <DashboardAluno />
              </RequireAuth>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </BrowserRouter>
  );
}

export default App;


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
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
import Protected from '@/components/Protected';
import { isAuthed } from '@/services/auth';

function App() {
  return (
    <BrowserRouter>
      <div className="page-wrapper">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthed() ? '/dashboard-professor' : '/login-professor'}
                replace
              />
            }
          />
          <Route path="/login-professor" element={<LoginProfessor />} />
          <Route path="/login-aluno" element={<LoginAluno />} />
          <Route
            path="/dashboard-professor"
            element={
              <Protected>
                <DashboardProfessor />
              </Protected>
            }
          />
          <Route
            path="/dashboard-aluno"
            element={
              <Protected>
                <DashboardAluno />
              </Protected>
            }
          />
          <Route
            path="/dashboard-redacoes"
            element={
              <Protected>
                <DashboardRedacoes />
              </Protected>
            }
          />
          <Route
            path="/turmas"
            element={
              <Protected>
                <Turmas />
              </Protected>
            }
          />
          <Route
            path="/turmas/:id/alunos"
            element={
              <Protected>
                <TurmaAlunos />
              </Protected>
            }
          />
          <Route
            path="/perfil"
            element={
              <Protected>
                <PerfilAlunoProfessor />
              </Protected>
            }
          />
          <Route
            path="/notas-classe"
            element={
              <Protected>
                <NotasClasse />
              </Protected>
            }
          />
          <Route
            path="/alunos/:id/notas"
            element={
              <Protected>
                <DetalhesNotaAluno />
              </Protected>
            }
          />
          <Route
            path="/caderno-classe"
            element={
              <Protected>
                <CadernoClasse />
              </Protected>
            }
          />
          <Route
            path="/criar-gabarito"
            element={
              <Protected>
                <CriarGabarito />
              </Protected>
            }
          />
          <Route
            path="/corrigir-gabaritos"
            element={
              <Protected>
                <CorrigirGabaritos />
              </Protected>
            }
          />
          <Route
            path="/redacoes/:id/corrigir"
            element={
              <Protected>
                <CorrigirRedacao />
              </Protected>
            }
          />
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </BrowserRouter>
  );
}

export default App;


import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginProfessor from './pages/LoginProfessor';
import LoginAluno from './pages/LoginAluno';
import DashboardProfessor from './pages/DashboardProfessor';
import DashboardAluno from './pages/DashboardAluno';
import Turmas from './pages/Turmas';
import TurmaAlunos from './pages/TurmaAlunos';
import PerfilAlunoProfessor from './pages/PerfilAlunoProfessor';
import NotasClasse from './pages/NotasClasse';
import DetalhesNotaAluno from './pages/DetalhesNotaAluno';
import CadernoClasse from './pages/CadernoClasse';
import CriarGabarito from './pages/CriarGabarito';
import CorrigirGabaritos from './pages/CorrigirGabaritos';

function App() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <Routes>
        <Route path="/login-professor" element={<LoginProfessor />} />
        <Route path="/login-aluno" element={<LoginAluno />} />
        <Route path="/dashboard-professor" element={<DashboardProfessor />} />
        <Route path="/dashboard-aluno" element={<DashboardAluno />} />
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/turmas/:id/alunos" element={<TurmaAlunos />} />
        <Route path="/perfil" element={<PerfilAlunoProfessor />} />
        <Route path="/notas-classe" element={<NotasClasse />} />
        <Route path="/alunos/:id/notas" element={<DetalhesNotaAluno />} />
        <Route path="/caderno-classe" element={<CadernoClasse />} />
        <Route path="/criar-gabarito" element={<CriarGabarito />} />
        <Route path="/corrigir-gabaritos" element={<CorrigirGabaritos />} />
      </Routes>
    </div>
  );
}

export default App;

import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="page-centered text-center space-y-4">
      <h1 className="text-3xl font-bold">Bem-vindo ao Site Professor Yago</h1>
      <p className="text-lg">Gerencie redações e notas com facilidade.</p>
      <div className="space-x-4">
        <Link to="/login-professor" className="btn-primary">Sou Professor</Link>
        <Link to="/login-aluno" className="btn-primary">Sou Aluno</Link>
      </div>
    </div>
  );
}

export default Landing;

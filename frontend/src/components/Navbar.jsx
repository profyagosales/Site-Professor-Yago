import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="backdrop-blur-md bg-gray-50/40 rounded-lg m-2 px-4 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-10">
      <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
        <Logo />
      </Link>
      <div className="hidden md:flex space-x-4">
        <Link to="/login-professor" className="link-primary">Login Professor</Link>
        <Link to="/login-aluno" className="link-primary">Login Aluno</Link>
        <Link to="/turmas" className="link-primary">Turmas</Link>
        <Link to="/notas-classe" className="link-primary">Notas da Classe</Link>
        <Link to="/caderno-classe" className="link-primary">Caderno</Link>
        <Link to="/criar-gabarito" className="link-primary">Criar Gabarito</Link>
      </div>
      <button className="md:hidden" onClick={() => setOpen(!open)}>
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
        </div>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-full bg-gray-50/40 backdrop-blur-md rounded-lg flex flex-col md:hidden">
          <Link to="/login-professor" className="p-2 link-primary" onClick={() => setOpen(false)}>Login Professor</Link>
          <Link to="/login-aluno" className="p-2 link-primary" onClick={() => setOpen(false)}>Login Aluno</Link>
          <Link to="/turmas" className="p-2 link-primary" onClick={() => setOpen(false)}>Turmas</Link>
          <Link to="/notas-classe" className="p-2 link-primary" onClick={() => setOpen(false)}>Notas da Classe</Link>
          <Link to="/caderno-classe" className="p-2 link-primary" onClick={() => setOpen(false)}>Caderno</Link>
          <Link to="/criar-gabarito" className="p-2 link-primary" onClick={() => setOpen(false)}>Criar Gabarito</Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;


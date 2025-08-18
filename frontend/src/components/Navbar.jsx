import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="backdrop-blur-md bg-white/40 rounded-lg m-2 px-4 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-10">
      <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
        <Logo />
      </Link>
      <div className="hidden md:flex space-x-4">
        <Link to="/login-professor" className="hover:text-orange">Login Professor</Link>
        <Link to="/login-aluno" className="hover:text-orange">Login Aluno</Link>
        <Link to="/turmas" className="hover:text-orange">Turmas</Link>
      </div>
      <button className="md:hidden" onClick={() => setOpen(!open)}>
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
        </div>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-full bg-white/40 backdrop-blur-md rounded-lg flex flex-col md:hidden">
          <Link to="/login-professor" className="p-2" onClick={() => setOpen(false)}>Login Professor</Link>
          <Link to="/login-aluno" className="p-2" onClick={() => setOpen(false)}>Login Aluno</Link>
          <Link to="/turmas" className="p-2" onClick={() => setOpen(false)}>Turmas</Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;

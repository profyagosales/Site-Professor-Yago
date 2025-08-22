import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const getRoleFromToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.role;
  } catch {
    return null;
  }
};

function Navbar() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState({ authed: false, role: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuth({ authed: true, role: getRoleFromToken(token) });
    }
  }, []);

  const teacherLinks = [
    { to: '/turmas', label: 'Turmas' },
    { to: '/notas-classe', label: 'Notas da Classe' },
    { to: '/caderno-classe', label: 'Caderno' },
    { to: '/corrigir-gabaritos', label: 'Gabaritos' },
    { to: '/dashboard-redacoes', label: 'Redação' }
  ];

  const studentLinks = [
    { to: '/dashboard-aluno', label: 'Dashboard' },
    { to: '/notas', label: 'Notas' },
    { to: '/caderno', label: 'Caderno' },
    { to: '/gabaritos', label: 'Gabaritos' },
    { to: '/redacao', label: 'Redação' }
  ];

  const links = auth.role === 'teacher' ? teacherLinks : auth.role === 'student' ? studentLinks : [];

  return (
    <nav className="backdrop-blur-md bg-white/30 rounded-lg m-2 px-4 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-10 shadow-lg transition-shadow">
      <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
        <Logo />
      </Link>
      <div className="hidden md:flex space-x-4">
        {auth.authed ? (
          links.map((l) => (
            <Link key={l.to} to={l.to} className="link-primary">
              {l.label}
            </Link>
          ))
        ) : (
          <>
            <Link to="/login-professor" className="link-primary">
              Login Professor
            </Link>
            <Link to="/login-aluno" className="link-primary">
              Login Aluno
            </Link>
          </>
        )}
      </div>
      <button className="md:hidden" onClick={() => setOpen(!open)}>
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
          <span className="block w-6 h-0.5 bg-black"></span>
        </div>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-full bg-white/30 backdrop-blur-md rounded-lg flex flex-col md:hidden shadow-lg">
          {auth.authed ? (
            links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="p-2 link-primary"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))
          ) : (
            <>
              <Link
                to="/login-professor"
                className="p-2 link-primary"
                onClick={() => setOpen(false)}
              >
                Login Professor
              </Link>
              <Link
                to="/login-aluno"
                className="p-2 link-primary"
                onClick={() => setOpen(false)}
              >
                Login Aluno
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;


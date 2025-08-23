import { Link } from 'react-router-dom';

const TEACHER_MENU = [
  { to: '/turmas', label: 'Turmas' },
  { to: '/notas-classe', label: 'Notas da Classe' },
  { to: '/caderno-classe', label: 'Caderno' },
  { to: '/corrigir-gabaritos', label: 'Gabarito' },
  { to: '/dashboard-redacoes', label: 'Redação' }
];

function getRole() {
  return localStorage.getItem('role');
}

export default function Header() {
  const role = getRole();
  const menu = role === 'teacher' ? TEACHER_MENU : [];
  return (
    <header className="app-nav w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-orange-600">Professor Yago</Link>
        <nav className="flex gap-4">
          {menu.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-orange-600">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

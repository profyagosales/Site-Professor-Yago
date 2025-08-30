import { Link } from 'react-router-dom';
import flags from '@/config/features';
import Avatar from './common/Avatar';

const TEACHER_MENU = [
  { to: '/turmas', label: 'Turmas' },
  { to: '/notas-classe', label: 'Notas da Classe' },
  { to: '/caderno-classe', label: 'Caderno' },
  { to: '/corrigir-gabaritos', label: 'Gabarito' },
  ...(flags.redaction ? [{ to: '/dashboard-redacoes', label: 'Redação' }] : []),
];

function getRole() {
  return localStorage.getItem('role');
}

export default function Header() {
  const role = getRole();
  const menu = role === 'teacher' ? TEACHER_MENU : [];
  const name = localStorage.getItem('userName') || '';
  const photo = localStorage.getItem('userPhoto') || '';
  return (
    <header className="app-nav w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-orange-600">Professor Yago</Link>
        <div className="flex items-center gap-4">
          <nav className="flex gap-4">
            {menu.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-orange-600">
                {item.label}
              </Link>
            ))}
          </nav>
          <Avatar src={photo} name={name} size={32} />
        </div>
      </div>
    </header>
  );
}

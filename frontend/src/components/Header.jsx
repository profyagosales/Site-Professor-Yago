import { Link, useLocation } from 'react-router-dom';
import flags from '@/config/features';
import Avatar from './Avatar';
import { isActive, getNavItemClasses } from '@/utils/nav';

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
  const location = useLocation();
  const role = getRole();
  const menu = role === 'teacher' ? TEACHER_MENU : [];
  const name = localStorage.getItem('userName') || '';
  const photo = localStorage.getItem('userPhoto') || undefined;
  
  return (
    <header className="app-nav w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-orange-600">Professor Yago</Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 justify-center flex-1">
            {menu.map((item) => {
              const active = isActive(location.pathname, item.to);
              return (
                <Link 
                  key={item.to} 
                  to={item.to} 
                  className={getNavItemClasses(active)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Avatar src={photo} name={name} size={32} />
        </div>
      </div>
    </header>
  );
}

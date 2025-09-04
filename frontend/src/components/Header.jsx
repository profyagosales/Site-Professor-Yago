import { Link, useLocation } from 'react-router-dom';
import flags from '@/config/features';
import Avatar from './Avatar';
import { isActive, getNavItemClasses } from '@/utils/nav';
import { ROUTES } from '@/routes';

const TEACHER_MENU = [
  { to: ROUTES.prof.turmas, label: 'Turmas' },
  { to: ROUTES.prof.notasClasse, label: 'Notas da Classe' },
  { to: ROUTES.prof.caderno, label: 'Caderno' },
  { to: ROUTES.prof.gabarito, label: 'Gabarito' },
  ...(flags.redaction ? [{ to: ROUTES.prof.redacao, label: 'Redação' }] : []),
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
    <header className='app-nav w-full border-b bg-white'>
      <div className='max-w-6xl mx-auto px-4 py-3 flex items-center justify-between'>
        <Link to={ROUTES.home} className='font-bold text-orange-600'>
          Professor Yago
        </Link>

        <nav className='hidden sm:flex items-center gap-1 justify-center flex-1'>
          {menu.map(item => {
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

        <div className='hidden sm:flex items-center'>
          <Avatar src={photo} name={name} size={32} />
        </div>
      </div>
    </header>
  );
}

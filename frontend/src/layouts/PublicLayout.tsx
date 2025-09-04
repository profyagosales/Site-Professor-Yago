import { Outlet, useLocation } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { ROUTES } from '@/routes';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const HIDE_ON = [ROUTES.auth.loginProf, ROUTES.auth.loginAluno];
  const showHeader = !HIDE_ON.includes(pathname);
  return (
    <div className="min-h-screen bg-white text-ys-ink">
      {showHeader && (
        <header className="p-4">
          <Link to={ROUTES.home} className="inline-block"><Logo /></Link>
        </header>
      )}
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

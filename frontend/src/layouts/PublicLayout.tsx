import { Outlet, useLocation } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Link } from 'react-router-dom';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const HIDE_ON = ['/login-professor', '/login-aluno'];
  const showHeader = !HIDE_ON.includes(pathname);
  return (
    <div className="min-h-screen bg-white text-ys-ink">
      {showHeader && (
        <header className="p-4">
          <Link to="/" className="inline-block"><Logo /></Link>
        </header>
      )}
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

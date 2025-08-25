import { Outlet } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white text-ys-ink">
      <header className="p-4">
        <Link to="/" className="inline-block"><Logo /></Link>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

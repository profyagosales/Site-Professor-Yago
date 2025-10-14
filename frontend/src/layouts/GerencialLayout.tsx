import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useGerencialAuth } from '@/store/GerencialAuthContext';

export default function GerencialLayout() {
  const { logout } = useGerencialAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/gerencial/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ys-bg text-ys-ink">
      <header className="border-b border-ys-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-ys-ink">Área gerencial</h1>
            <p className="text-sm text-ys-graphite">Cadastro e gestão de professores</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

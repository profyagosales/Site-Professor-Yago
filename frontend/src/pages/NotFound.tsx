import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/routes';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-ys-ink">Página não encontrada</h1>
        <p className="text-ys-ink-2 mt-2 mb-6">Verifique o endereço ou volte para a página inicial.</p>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={ROUTES.home}>
              <Button variant="outline" className="w-full sm:w-auto">
                Página inicial
              </Button>
            </Link>
            <Link to={ROUTES.aluno.login}>
              <Button variant="outline" className="w-full sm:w-auto">
                Login do Aluno
              </Button>
            </Link>
            <Link to={ROUTES.auth.loginProf}>
              <Button variant="outline" className="w-full sm:w-auto">
                Login do Professor
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

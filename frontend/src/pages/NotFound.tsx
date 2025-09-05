import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/routes';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className='min-h-[60vh] grid place-items-center p-6 text-center'>
      <div className='max-w-lg'>
        {/* Ícone de erro */}
        <div className='mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600'>
          <svg
            data-testid='error-icon'
            className='h-8 w-8'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>

        <h1 className='text-3xl font-bold text-ys-ink mb-2'>
          Página não encontrada
        </h1>
        <p className='text-ys-ink-2 mb-2'>
          A página{' '}
          <code className='bg-gray-100 px-2 py-1 rounded text-sm'>
            {location.pathname}
          </code>{' '}
          não existe.
        </p>
        <p className='text-ys-ink-3 text-sm mb-8'>
          Verifique o endereço ou escolha uma das opções abaixo para continuar.
        </p>

        <div className='space-y-4'>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Link to={ROUTES.home}>
              <Button className='w-full sm:w-auto'>🏠 Página inicial</Button>
            </Link>
            <Link to={ROUTES.aluno.login}>
              <Button variant='outline' className='w-full sm:w-auto'>
                👨‍🎓 Login do Aluno
              </Button>
            </Link>
            <Link to={ROUTES.auth.loginProf}>
              <Button variant='outline' className='w-full sm:w-auto'>
                👨‍🏫 Login do Professor
              </Button>
            </Link>
          </div>

          {/* Links úteis baseados no contexto */}
          <div className='pt-4 border-t border-gray-200'>
            <p className='text-sm text-ys-ink-3 mb-3'>Ou acesse diretamente:</p>
            <div className='flex flex-wrap gap-2 justify-center'>
              <Link
                to={ROUTES.prof.resumo}
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                Dashboard Professor
              </Link>
              <span className='text-gray-300'>•</span>
              <Link
                to={ROUTES.aluno.resumo}
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                Dashboard Aluno
              </Link>
              <span className='text-gray-300'>•</span>
              <Link
                to={ROUTES.prof.turmas}
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                Turmas
              </Link>
              <span className='text-gray-300'>•</span>
              <Link
                to={ROUTES.prof.redacao}
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                Redações
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';

export default function Landing() {
  const nav = useNavigate();
  return (
    <section className='relative overflow-hidden'>
      <div className='max-w-6xl mx-auto px-4 pt-16 pb-24'>
        <div className='flex flex-col items-center text-center'>
          <div className='mb-6 inline-flex h-24 w-24 items-center justify-center rounded-2xl shadow-ys-glow bg-white border border-ys-line'>
            {/* seu ícone YS em laranja */}
            <svg width='64' height='64' viewBox='0 0 24 24' fill='none'>
              <rect
                x='2'
                y='2'
                width='20'
                height='20'
                rx='6'
                stroke='#FF7A00'
                strokeWidth='2'
              />
              <path
                d='M7 9l3 3-3 3'
                stroke='#FF7A00'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M14 9h3m-3 6h3'
                stroke='#FF7A00'
                strokeWidth='2'
                strokeLinecap='round'
              />
            </svg>
          </div>

          <p className='tracking-[0.3em] text-xs text-ys-ink-3 mb-2'>
            PROFESSOR
          </p>
          <h1 className='text-4xl sm:text-5xl font-extrabold text-ys-ink mb-3'>
            <span className='text-ys-amber drop-shadow'>Yago Sales</span>
          </h1>
          <p className='text-ys-ink-2 mb-6'>
            Notas • Redação • Recados • Gabaritos
          </p>

          <div className='flex flex-wrap items-center gap-3 mb-12'>
            <Button
              data-testid='cta-prof'
              onClick={() => nav(ROUTES.auth.loginProf)}
            >
              Sou Professor
            </Button>
            <Button
              data-testid='cta-aluno'
              onClick={() => nav(ROUTES.aluno.login)}
            >
              Sou Aluno
            </Button>
          </div>

          {/* Card de assinatura menorzinho */}
          <Card className='max-w-2xl w-full'>
            <CardBody>
              <div className='text-base font-semibold text-ys-ink text-center'>
                Centro de Ensino Médio 01 do Paranoá
              </div>
              <div className='text-sm text-ys-ink-2 text-center mt-1'>
                CEM 01 do Paranoá
              </div>

              <p className='text-ys-ink-2 text-center mt-3'>
                Controle de notas, redação, gabaritos e avisos
              </p>

              <p className='text-ys-ink-2 text-center mt-3'>
                Desenvolvido por{' '}
                <span className='font-semibold text-ys-amber'>
                  Professor Yago Sales
                </span>
              </p>

              <hr className='my-4 border-ys-line' />
              <p className='text-xs text-ys-ink-3 text-center'>
                © {new Date().getFullYear()} Yago Sales. Todos os direitos
                reservados.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}

import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';

export default function RecadosAluno() {
  return (
    <Page title='Recados'>
      <div className='space-y-6'>
        <Card className='p-6'>
          <div className='text-center py-8'>
            <svg
              className='mx-auto h-12 w-12 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              Nenhum recado disponível
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              Os recados do professor aparecerão aqui.
            </p>
          </div>
        </Card>
      </div>
    </Page>
  );
}

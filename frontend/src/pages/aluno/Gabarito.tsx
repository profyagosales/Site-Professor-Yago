import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';

export default function AlunoGabarito() {
  return (
    <Page title='Gabaritos'>
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
                d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              Nenhum gabarito disponível
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              Os gabaritos das redações aparecerão aqui.
            </p>
          </div>
        </Card>
      </div>
    </Page>
  );
}

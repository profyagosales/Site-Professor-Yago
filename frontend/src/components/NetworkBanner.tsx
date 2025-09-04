import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function NetworkBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { isOnline, retryCount, retryConnection } = useNetworkStatus();
  const toast = useToast();

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      toast.warning('Conexão perdida. Verificando...');
    } else {
      setIsVisible(false);
      if (retryCount > 0) {
        toast.success('Conexão restaurada!');
      }
    }
  }, [isOnline, retryCount, toast]);

  const handleRetry = async () => {
    const success = await retryConnection();

    if (!success) {
      if (retryCount < 3) {
        toast.info(`Tentativa ${retryCount + 1} de 3...`);
      } else {
        toast.error('Não foi possível restaurar a conexão');
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className='fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg'>
      <div className='max-w-7xl mx-auto px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <svg
              className='h-5 w-5 text-red-200 flex-shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>

            <div className='flex-1'>
              <p className='text-sm font-medium'>Sem conexão com a internet</p>
              <p className='text-xs text-red-200'>
                Verifique sua conexão e tente novamente
                {retryCount > 0 && ` • Tentativa ${retryCount}`}
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className='px-3 py-1 text-xs font-medium bg-red-700 hover:bg-red-800 disabled:bg-red-800 disabled:opacity-50 rounded transition-colors'
            >
              {retryCount >= 3 ? 'Máx. tentativas' : 'Tentar Novamente'}
            </button>

            <button
              onClick={handleDismiss}
              className='p-1 text-red-200 hover:text-white transition-colors'
              aria-label='Fechar banner'
            >
              <svg
                className='h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

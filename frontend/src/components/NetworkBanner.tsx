import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBackendHealth } from '@/services/health';

export default function NetworkBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { isOnline, retryCount, retryConnection } = useNetworkStatus();
  const { isHealthy, isChecking, retryCount: backendRetryCount, retry: retryBackend } = useBackendHealth();
  const toast = useToast();

  // Determinar se deve mostrar o banner
  const shouldShow = !isOnline || !isHealthy;
  const isBackendDown = isOnline && !isHealthy;

  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
      if (!isOnline) {
        toast.warning('Conexão perdida. Verificando...');
      } else if (isBackendDown) {
        toast.warning('Serviço temporariamente indisponível. Algumas ações podem falhar.');
      }
    } else {
      setIsVisible(false);
      if (retryCount > 0 || backendRetryCount > 0) {
        toast.success('Conexão restaurada!');
      }
    }
  }, [isOnline, isHealthy, shouldShow, isBackendDown, retryCount, backendRetryCount, toast]);

  const handleRetry = async () => {
    let success = false;
    
    if (!isOnline) {
      success = await retryConnection();
    } else if (isBackendDown) {
      success = await retryBackend();
    }

    if (!success) {
      const totalRetries = retryCount + backendRetryCount;
      if (totalRetries < 3) {
        toast.info(`Tentativa ${totalRetries + 1} de 3...`);
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
    <div className='sticky top-0 left-0 right-0 z-40 bg-gray-100 text-gray-700 border-b border-gray-200 shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 py-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <div className='flex items-center space-x-1'>
              <div className={`w-2 h-2 rounded-full ${isChecking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
              <svg
                className='h-4 w-4 text-gray-500 flex-shrink-0'
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
            </div>

            <div className='flex-1'>
              <p className='text-sm text-gray-700'>
                {!isOnline 
                  ? 'Sem conexão com a internet' 
                  : 'Serviço temporariamente indisponível'
                }
              </p>
              <p className='text-xs text-gray-500'>
                {!isOnline 
                  ? 'Verifique sua conexão e tente novamente'
                  : 'Algumas ações podem falhar'
                }
                {(retryCount > 0 || backendRetryCount > 0) && ` • Tentativa ${retryCount + backendRetryCount}`}
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <button
              onClick={handleRetry}
              disabled={(retryCount + backendRetryCount) >= 3 || isChecking}
              className='px-2 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors'
            >
              {isChecking ? 'Verificando...' : 
               (retryCount + backendRetryCount) >= 3 ? 'Máx. tentativas' : 'Tentar Novamente'}
            </button>

            <button
              onClick={handleDismiss}
              className='p-1 text-gray-400 hover:text-gray-600 transition-colors'
              aria-label='Fechar banner'
            >
              <svg
                className='h-3 w-3'
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

               (retryCount + backendRetryCount) >= 3 ? 'Máx. tentativas' : 'Tentar Novamente'}
            </button>

            <button
              onClick={handleDismiss}
              className='p-1 text-gray-400 hover:text-gray-600 transition-colors'
              aria-label='Fechar banner'
            >
              <svg
                className='h-3 w-3'
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

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log usando o sistema de logger
    logger.error(
      'ErrorBoundary caught an error',
      {
        component: 'AppErrorBoundary',
        action: 'componentDidCatch',
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      error
    );

    this.setState({
      error,
      errorInfo,
    });

    // Mostrar toast apenas em produção para não ser intrusivo
    if (!import.meta.env.DEV) {
      // Usar setTimeout para evitar problemas com o contexto
      setTimeout(() => {
        try {
          // Tentar mostrar toast se disponível
          const event = new CustomEvent('show-toast', {
            detail: {
              type: 'error',
              message: 'Ocorreu um erro inesperado. A página será recarregada.',
            },
          });
          window.dispatchEvent(event);
        } catch (e) {
          // Fallback silencioso se não conseguir mostrar toast
          logger.warn('Failed to show error toast', {
            component: 'AppErrorBoundary',
            action: 'showToast',
          });
        }
      }, 100);
    }
  }

  handleRetry = () => {
    logger.info('User retried after error', {
      component: 'AppErrorBoundary',
      action: 'retry',
    });
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    logger.info('User reloaded page after error', {
      component: 'AppErrorBoundary',
      action: 'reload',
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
          <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center'>
            <div className='mb-4'>
              <svg
                className='mx-auto h-12 w-12 text-red-500'
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

            <h1 className='text-xl font-semibold text-gray-900 mb-2'>
              Ops! Algo deu errado
            </h1>

            <p className='text-gray-600 mb-6'>
              Ocorreu um erro inesperado. Você pode tentar recarregar a página
              ou voltar ao início.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className='mb-6 text-left'>
                <summary className='cursor-pointer text-sm text-gray-500 hover:text-gray-700'>
                  Detalhes do erro (DEV)
                </summary>
                <div className='mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-red-600 overflow-auto max-h-32'>
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div className='mt-2'>
                      <strong>Component Stack:</strong>
                      <pre className='whitespace-pre-wrap'>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <button
                onClick={this.handleRetry}
                className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors'
              >
                Tentar Novamente
              </button>

              <button
                onClick={this.handleReload}
                className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors'
              >
                Recarregar Página
              </button>
            </div>

            <div className='mt-4'>
              <a
                href='/'
                className='text-sm text-orange-600 hover:text-orange-700 hover:underline'
              >
                ← Voltar ao início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

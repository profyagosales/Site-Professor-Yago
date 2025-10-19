import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary] Uncaught error', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Algo deu errado</h1>
            <p className="mt-2 text-sm text-slate-600">
              Encontramos um problema ao carregar esta página. Tente novamente para continuar.
            </p>
            {this.state.error ? (
              <p className="mt-2 text-xs text-slate-400">
                {this.state.error.message || 'Erro desconhecido'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

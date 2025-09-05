import { ReactNode, Suspense } from 'react';
import { useLazyLoadOnVisible } from '@/hooks/useLazyLoad';

type LazyChartsProps = {
  children: (chartLib: any) => ReactNode;
  fallback?: ReactNode;
  className?: string;
};

/**
 * Componente para carregamento diferido de bibliotecas de gráficos
 * Só carrega quando o componente fica visível na tela
 */
export function LazyCharts({ children, fallback, className }: LazyChartsProps) {
  const {
    data: chartLib,
    loading,
    error,
    ref,
  } = useLazyLoadOnVisible(
    () => import('chart.js'), // Exemplo - pode ser trocado por outra lib
    []
  );

  if (error) {
    console.warn('Failed to load chart library:', error);
    return <div className={className}>{children({})}</div>;
  }

  if (loading) {
    return <div className={className}>{fallback}</div>;
  }

  if (!chartLib) {
    return (
      <div ref={ref} className={className}>
        {fallback}
      </div>
    );
  }

  return <Suspense fallback={fallback}>{children(chartLib)}</Suspense>;
}

/**
 * Hook para usar bibliotecas de gráficos de forma lazy
 */
export function useLazyCharts() {
  return useLazyLoadOnVisible(() => import('chart.js'), []);
}

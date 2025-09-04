import { ReactNode, Suspense } from 'react';
import { useLazyLoadOnInteraction } from '@/hooks/useLazyLoad';

type LazyMotionProps = {
  children: (motion: any) => ReactNode;
  fallback?: ReactNode;
  className?: string;
};

/**
 * Componente para carregamento diferido do Framer Motion
 * Só carrega quando o usuário interage com o componente
 */
export function LazyMotion({ children, fallback, className }: LazyMotionProps) {
  const { data: motion, loading, error, load } = useLazyLoadOnInteraction(
    () => import('framer-motion'),
    []
  );

  if (error) {
    console.warn('Failed to load Framer Motion:', error);
    return <div className={className}>{children({})}</div>;
  }

  if (loading) {
    return <div className={className}>{fallback}</div>;
  }

  if (!motion) {
    return (
      <div 
        className={className} 
        onMouseEnter={load}
        onFocus={load}
        onTouchStart={load}
      >
        {children({})}
      </div>
    );
  }

  return (
    <Suspense fallback={fallback}>
      {children(motion)}
    </Suspense>
  );
}

/**
 * Hook para usar Framer Motion de forma lazy
 */
export function useLazyMotion() {
  return useLazyLoadOnInteraction(() => import('framer-motion'), []);
}

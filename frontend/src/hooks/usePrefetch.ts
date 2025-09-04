import { useCallback } from 'react';

// Cache para evitar prefetch duplicado
const prefetchedRoutes = new Set<string>();

export function usePrefetch() {
  const prefetchRoute = useCallback((routePath: string) => {
    // Evita prefetch duplicado
    if (prefetchedRoutes.has(routePath)) {
      return;
    }

    // Mapeia rotas para seus imports
    const routeImports: Record<string, () => Promise<any>> = {
      '/professor/resumo': () => import('@/pages/DashboardProfessor'),
      '/professor/turmas': () => import('@/pages/professor/Turmas'),
      '/professor/notas-da-classe': () =>
        import('@/pages/redacao/DashboardRedacoes'),
      '/professor/redacao': () => import('@/pages/redacao/DashboardRedacoes'),
      '/aluno/resumo': () => import('@/pages/DashboardAluno'),
      '/aluno/notas': () => import('@/pages/aluno/Notas'),
      '/aluno/redacao': () => import('@/pages/aluno/Redacoes'),
      '/aluno/caderno': () => import('@/pages/aluno/Caderno'),
      '/aluno/gabaritos': () => import('@/pages/aluno/Gabarito'),
    };

    const importFn = routeImports[routePath];
    if (importFn) {
      prefetchedRoutes.add(routePath);

      // Prefetch com baixa prioridade
      importFn().catch(error => {
        console.warn(`Failed to prefetch route ${routePath}:`, error);
        // Remove do cache em caso de erro para permitir retry
        prefetchedRoutes.delete(routePath);
      });
    }
  }, []);

  return { prefetchRoute };
}

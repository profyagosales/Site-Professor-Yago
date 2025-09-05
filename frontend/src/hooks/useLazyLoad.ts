import { useState, useEffect, useCallback } from 'react';

type LazyLoadState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Hook para carregamento diferido de bibliotecas pesadas
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): LazyLoadState<T> & { load: () => void } {
  const [state, setState] = useState<LazyLoadState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (state.data || state.loading) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to load'),
      });
    }
  }, [loader, state.data, state.loading]);

  return { ...state, load };
}

/**
 * Hook para carregamento diferido baseado em interação do usuário
 */
export function useLazyLoadOnInteraction<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): LazyLoadState<T> & { load: () => void } {
  const [hasInteracted, setHasInteracted] = useState(false);
  const lazyState = useLazyLoad(loader, deps);

  useEffect(() => {
    if (hasInteracted && !lazyState.data && !lazyState.loading) {
      lazyState.load();
    }
  }, [hasInteracted, lazyState]);

  const load = useCallback(() => {
    setHasInteracted(true);
    lazyState.load();
  }, [lazyState]);

  return { ...lazyState, load };
}

/**
 * Hook para carregamento diferido baseado em visibilidade
 */
export function useLazyLoadOnVisible<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): LazyLoadState<T> & {
  load: () => void;
  ref: (node: HTMLElement | null) => void;
} {
  const [isVisible, setIsVisible] = useState(false);
  const lazyState = useLazyLoad(loader, deps);

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
  }, []);

  useEffect(() => {
    if (isVisible && !lazyState.data && !lazyState.loading) {
      lazyState.load();
    }
  }, [isVisible, lazyState]);

  return { ...lazyState, load, ref };
}

/**
 * Hook para carregamento diferido baseado em hover
 */
export function useLazyLoadOnHover<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): LazyLoadState<T> & { load: () => void; onMouseEnter: () => void } {
  const [hasHovered, setHasHovered] = useState(false);
  const lazyState = useLazyLoad(loader, deps);

  useEffect(() => {
    if (hasHovered && !lazyState.data && !lazyState.loading) {
      lazyState.load();
    }
  }, [hasHovered, lazyState]);

  const onMouseEnter = useCallback(() => {
    setHasHovered(true);
  }, []);

  return { ...lazyState, load, onMouseEnter };
}

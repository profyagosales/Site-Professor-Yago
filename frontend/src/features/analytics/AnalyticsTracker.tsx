import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { loadAnalyticsOnce } from '@/lib/analytics-singleton';

export function AnalyticsTracker(): null {
  const loc = useLocation();

  useEffect(() => {
    const shouldLoadAnalytics =
      import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';

    if (shouldLoadAnalytics) {
      loadAnalyticsOnce().catch(error => {
        console.warn('[analytics] Falha ao carregar analytics:', error);
      });
    }
  }, []);

  useEffect(() => {
    // Chame sua função de pageview aqui
    // window.gtag?.('event', 'page_view', { page_path: loc.pathname });
  }, [loc.pathname]);

  return null;
}


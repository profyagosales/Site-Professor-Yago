import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { RouterProvider } from 'react-router-dom';
import { bootstrapAuthFromStorage } from '@/services/api';
import { initializeSession } from '@/services/session';
// Feature flags via env
(() => {
  const yes = (v: any) => typeof v === 'string' && /^(1|true|yes|on)$/i.test(v);
  const rich = (import.meta as any)?.env?.VITE_USE_RICH_ANNOS;
  const virt = (import.meta as any)?.env?.VITE_VIRT_PDF;
  const buffer = (import.meta as any)?.env?.VITE_VIRT_BUFFER;
  (window as any).YS_USE_RICH_ANNOS =
    yes(rich) || (import.meta.env.DEV && rich == null);
  if (virt != null) (window as any).YS_VIRT_PDF = yes(virt);
  if (buffer != null && !Number.isNaN(Number(buffer)))
    (window as any).YS_VIRT_BUFFER = Number(buffer);
})();
import { router } from './router';
import { AuthProvider } from './store/AuthContext';
import { UIProvider } from './providers/UIProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { loadAnalyticsOnce } from './lib/analytics-singleton';

// Bootstrap da autenticação com novo sistema de sessão
function bootstrapAuth() {
  bootstrapAuthFromStorage();
  initializeSession();
}

// Bootstrap do analytics (apenas uma vez)
function bootstrapAnalytics() {
  // Carregar analytics apenas em produção ou quando explicitamente habilitado
  const shouldLoadAnalytics = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
  
  if (shouldLoadAnalytics) {
    loadAnalyticsOnce().catch(error => {
      console.warn('[analytics] Falha ao carregar analytics:', error);
    });
  }
}

// garantir que roda antes do <App/>
bootstrapAuth();
bootstrapAnalytics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UIProvider>
      <AuthProvider>
        <div className='ys-noise' />
        <RouterProvider router={router} />
        <ToastProvider />
      </AuthProvider>
    </UIProvider>
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { RouterProvider } from 'react-router-dom';
// Feature flags via env
(() => {
  const yes = (v: any) => typeof v === 'string' && /^(1|true|yes|on)$/i.test(v);
  const rich = (import.meta as any)?.env?.VITE_USE_RICH_ANNOS;
  const virt = (import.meta as any)?.env?.VITE_VIRT_PDF;
  const buffer = (import.meta as any)?.env?.VITE_VIRT_BUFFER;
  (window as any).YS_USE_RICH_ANNOS = yes(rich) || (import.meta.env.DEV && rich == null);
  if (virt != null) (window as any).YS_VIRT_PDF = yes(virt);
  if (buffer != null && !Number.isNaN(Number(buffer))) (window as any).YS_VIRT_BUFFER = Number(buffer);
})();
import { router } from './router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { APP_VERSION } from './version';
import { AuthProvider } from '@/store/AuthContext';
import { GerencialAuthProvider } from '@/store/GerencialAuthContext';

console.info('[app] version:', APP_VERSION);

const { StrictMode } = React;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <GerencialAuthProvider>
        <div className="ys-noise" />
        <RouterProvider router={router} />
        <ToastContainer aria-label="notificações" position="top-right" autoClose={3000} hideProgressBar theme="light" />
      </GerencialAuthProvider>
    </AuthProvider>
  </StrictMode>
);

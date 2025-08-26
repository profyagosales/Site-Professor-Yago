import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { RouterProvider } from 'react-router-dom';
// Feature flags (dev)
if (import.meta.env.DEV) {
  (window as any).YS_USE_RICH_ANNOS = true;
}
import { router } from './router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="ys-noise" />
  <RouterProvider router={router} />
  <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="light" />
  </React.StrictMode>
);

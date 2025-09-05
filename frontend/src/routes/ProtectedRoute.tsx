import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/services/api';
import { ROUTES } from '@/routes';
import { shouldCallAuthMe, isPublicRoute } from '@/lib/route-guards';
import { useLocation } from 'react-router-dom';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const [ok, setOk] = useState<null | boolean>(null);
  const location = useLocation();

  useEffect(() => {
    // Se é rota pública, não verificar autenticação
    if (isPublicRoute(location.pathname)) {
      setOk(true);
      return;
    }

    // Verificar se deve chamar /auth/me
    const token = localStorage.getItem('auth_token');
    if (!shouldCallAuthMe(token)) {
      setOk(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        await api.get('/auth/me');
        if (alive) setOk(true);
      } catch (err: any) {
        if (alive) setOk(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  if (ok === null) return <div className='p-6 text-gray-700'>Carregando…</div>;
  if (!ok) return <Navigate to={ROUTES.auth.loginProf} replace />;
  return children;
}

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/services/api';
import { ROUTES } from '@/routes';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get('/auth/me');
        if (alive) setOk(true);
      } catch (err: any) {
        if (alive) setErr(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return <div className='p-6 text-gray-700'>Carregando…</div>;
  if (!ok) return <Navigate to={ROUTES.auth.loginProf} replace />;
  return children;
}

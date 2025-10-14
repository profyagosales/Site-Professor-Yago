import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGerencialAuth } from '@/store/GerencialAuthContext';

export default function GerencialGuard({ children }: PropsWithChildren) {
  const { token } = useGerencialAuth();
  const location = useLocation();

  if (!token) {
    const redirect = typeof location?.pathname === 'string' ? location.pathname + location.search : undefined;
    return <Navigate to="/gerencial/login" replace state={redirect ? { next: redirect } : undefined} />;
  }

  return <>{children}</>;
}

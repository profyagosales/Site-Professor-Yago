import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/routes';

export function RequireAuth() {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to={ROUTES.auth.loginProf} replace />;

  // (Opcional) poderíamos validar com /auth/me em um efeito,
  // mas não bloqueie render com tela branca quando não houver token.
  return <Outlet />;
}

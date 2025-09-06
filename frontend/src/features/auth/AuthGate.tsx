import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthStateProvider';
import { installApiInterceptors } from '@/services/api';
import {
  PUBLIC_ROUTES,
  HOME_PATH,
  LOGIN_ALUNO_PATH,
  LOGIN_PROFESSOR_PATH,
} from '@/routes/paths';

export function AuthGate(): null {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedOnceRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      installApiInterceptors(logout, (to: string, opts?: any) => navigate(to, opts));
    }
  }, [loading, logout, navigate]);

  useEffect(() => {
    if (loading) return;

    const path = location.pathname;
    const isPublic = PUBLIC_ROUTES.has(path);

    const redirectOnce = (to: string) => {
      if (redirectedOnceRef.current) return;
      redirectedOnceRef.current = true;
      navigate(to, { replace: true });
      setTimeout(() => (redirectedOnceRef.current = false), 0);
    };

    // Não autenticado: só bloqueia rotas privadas
    if (!user && !isPublic) {
      redirectOnce(LOGIN_ALUNO_PATH); // login padrão
      return;
    }

    // Autenticado: se está numa tela de login, manda pra home
    if (user && (path === LOGIN_ALUNO_PATH || path === LOGIN_PROFESSOR_PATH)) {
      redirectOnce(HOME_PATH);
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}


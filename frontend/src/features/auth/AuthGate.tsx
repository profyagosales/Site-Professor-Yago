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
  const { pathname } = useLocation();
  const redirectedOnceRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      installApiInterceptors(logout, (to: string, opts?: any) => navigate(to, opts));
    }
  }, [loading, logout, navigate]);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.has(pathname);
    const redirectOnce = (to: string) => {
      if (redirectedOnceRef.current) return;
      redirectedOnceRef.current = true;
      navigate(to, { replace: true });
      setTimeout(() => (redirectedOnceRef.current = false), 0);
    };

    if (!user && !isPublic) {
      redirectOnce(LOGIN_ALUNO_PATH);
      return;
    }

    if (user && (pathname === LOGIN_ALUNO_PATH || pathname === LOGIN_PROFESSOR_PATH)) {
      redirectOnce(HOME_PATH);
      return;
    }
  }, [user, loading, pathname, navigate]);

  return null;
}

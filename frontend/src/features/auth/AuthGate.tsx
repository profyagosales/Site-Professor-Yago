import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthStateProvider';
import { installApiInterceptors } from '@/services/api';

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

    const isPublic =
      location.pathname.startsWith('/login') ||
      location.pathname.startsWith('/recuperar-senha');

    const redirectOnce = (to: string) => {
      if (redirectedOnceRef.current) return;
      redirectedOnceRef.current = true;
      navigate(to, { replace: true });
      setTimeout(() => (redirectedOnceRef.current = false), 0);
    };

    if (!user && !isPublic) {
      redirectOnce('/login');
      return;
    }

    if (user && isPublic) {
      redirectOnce('/');
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}


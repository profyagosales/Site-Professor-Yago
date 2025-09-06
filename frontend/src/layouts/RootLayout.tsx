import React from 'react';
import { Outlet } from 'react-router-dom';
import { DataProvider } from '@/providers/DataProvider';
import { UIProvider } from '@/providers/UIProvider';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthStateProvider } from '@/store/AuthStateProvider';
import { AuthGate } from '@/features/auth/AuthGate';
import { AnalyticsTracker } from '@/features/analytics/AnalyticsTracker';

export default function RootLayout(): JSX.Element {
  return (
    <DataProvider>
      <UIProvider>
        <AuthStateProvider>
          {/* Tudo abaixo está DENTRO do Router (ver router.tsx) */}
          <AnalyticsTracker />
          <AuthGate />
          <div className="ys-noise" />
          <ToastProvider />
          <Outlet />
        </AuthStateProvider>
      </UIProvider>
    </DataProvider>
  );
}


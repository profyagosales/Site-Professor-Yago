import { Outlet } from 'react-router-dom';
import AppShell from '@/components/AppShell';

export default function AppShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

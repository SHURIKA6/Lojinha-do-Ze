'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isAdmin) {
      router.replace('/conta');
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem('admin-sidebar-collapsed');

    if (storedPreference === 'true' || storedPreference === 'false') {
      setIsSidebarCollapsed(storedPreference === 'true');
    }

    setHasLoadedSidebarPreference(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarPreference) {
      return;
    }

    window.localStorage.setItem('admin-sidebar-collapsed', String(isSidebarCollapsed));
  }, [hasLoadedSidebarPreference, isSidebarCollapsed]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="app-loader" aria-live="polite">
        <div className="app-loader__spinner" />
        <p>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div
      className="admin-view layout"
      data-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}
    >
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
      />
      <main className="layout__main">{children}</main>
    </div>
  );
}

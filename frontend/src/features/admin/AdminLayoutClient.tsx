'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

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

  if (loading || !user || !isAdmin) {
    return (
      <div className="app-loader" aria-live="polite">
        <div className="app-loader__spinner" />
        <p>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="admin-view layout">
      <Sidebar />
      <main className="layout__main">{children}</main>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/login');
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="app-loader">
        <div className="app-loader__spinner" />
        <p>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">{children}</main>
    </div>
  );
}

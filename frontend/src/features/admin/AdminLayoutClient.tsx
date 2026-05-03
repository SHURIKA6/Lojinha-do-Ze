/**
 * Feature: AdminLayoutClient
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/contexts/AuthContext';
import { useNotifications } from '@/core/hooks/useNotifications';
import Sidebar from '@/components/Sidebar';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  
  // Conecta ao WebSocket de Notificações
  useNotifications();

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
    <div className="layout">
      <Sidebar />
      <main className="layout__main">{children}</main>
    </div>
  );
}

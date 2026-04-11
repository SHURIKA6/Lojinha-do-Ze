import React from 'react';
import AdminLayoutClient from '@/features/admin/AdminLayoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

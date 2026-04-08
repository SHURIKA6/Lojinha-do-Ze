import './dashboard.css';
import { ReactNode } from 'react';
import AdminLayoutClient from '@/features/admin/AdminLayoutClient';

export const metadata = {
  title: 'Painel Admin | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

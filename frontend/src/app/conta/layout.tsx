import React from 'react';
import ClienteLayoutClient from '@/features/account/ClienteLayoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minha Conta | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

interface ContaLayoutProps {
  children: React.ReactNode;
}

export default function ContaLayout({ children }: ContaLayoutProps) {
  return <ClienteLayoutClient>{children}</ClienteLayoutClient>;
}

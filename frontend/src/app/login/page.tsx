import React from 'react';
import LoginPageClient from '@/features/auth/LoginPageClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar | Lojinha do Zé',
  description: 'Acesse sua conta de cliente ou o painel administrativo da Lojinha do Zé.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginPage() {
  return <LoginPageClient />;
}

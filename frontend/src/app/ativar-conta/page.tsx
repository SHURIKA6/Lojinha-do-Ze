import React, { Suspense } from 'react';
import SetupPasswordPageClient from '@/features/auth/SetupPasswordPageClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ativar Conta | Lojinha do Zé',
  description: 'Defina sua senha para ativar sua conta com segurança.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/ativar-conta',
  },
};

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetupPasswordPageClient />
    </Suspense>
  );
}

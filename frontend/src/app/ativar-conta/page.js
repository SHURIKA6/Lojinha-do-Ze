import { Suspense } from 'react';
import SetupPasswordPageClient from '@/features/auth/SetupPasswordPageClient';

export const metadata = {
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

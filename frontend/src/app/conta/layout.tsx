import { ReactNode } from 'react';
import ClienteLayoutClient from '@/features/account/ClienteLayoutClient';

export const metadata = {
  title: 'Minha Conta | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ContaLayout({ children }: { children: ReactNode }) {
  return <ClienteLayoutClient>{children}</ClienteLayoutClient>;
}

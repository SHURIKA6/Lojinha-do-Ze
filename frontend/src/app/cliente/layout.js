import ClienteLayoutClient from '@/features/account/ClienteLayoutClient';

export const metadata = {
  title: 'Minha Conta | Lojinha do Zé',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClienteLayout({ children }) {
  return <ClienteLayoutClient>{children}</ClienteLayoutClient>;
}

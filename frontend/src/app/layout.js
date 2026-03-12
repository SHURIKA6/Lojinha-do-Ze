import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'Lojinha do Zé - Produtos Fitoterápicos',
  description: 'Sistema de gestão e pedidos de produtos naturais e fitoterápicos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

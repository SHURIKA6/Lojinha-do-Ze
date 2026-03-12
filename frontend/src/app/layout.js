import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'Lojinha do Zé',
  description: 'Produtos Fitoterápicos e Cosméticos',
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

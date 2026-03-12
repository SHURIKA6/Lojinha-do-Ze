import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'Lojinha do Zé - Sistema de Gestão',
  description: 'Sistema completo de gestão para assistência técnica - controle de estoque, finanças, clientes e serviços.',
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

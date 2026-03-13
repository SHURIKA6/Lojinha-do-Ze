import './globals.css';
import './experience.css';
import './storefront.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { Fraunces, Manrope } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Lojinha do Zé',
  description: 'Produtos fitoterápicos e naturais com vitrine, pedidos e gestão em uma experiência premium.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

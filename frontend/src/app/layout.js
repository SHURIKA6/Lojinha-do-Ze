import './globals.css';
import './experience.css';
import './storefront.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Lojinha do Zé',
    template: '%s | Lojinha do Zé',
  },
  description:
    'Produtos fitoterápicos e naturais com vitrine, pedidos e gestão em uma experiência premium.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lojinha do Zé',
    description:
      'Compre produtos fitoterápicos e naturais com uma experiência clara, rápida e confiável.',
    url: siteUrl,
    siteName: 'Lojinha do Zé',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lojinha do Zé',
    description:
      'Compre produtos fitoterápicos e naturais com uma experiência clara, rápida e confiável.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <ErrorBoundary>
          <ToastProvider>
            <ConfirmDialogProvider>
              <AuthProvider>{children}</AuthProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

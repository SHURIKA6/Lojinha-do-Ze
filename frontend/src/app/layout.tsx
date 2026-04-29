import './globals.css';
import './experience.css';
import './storefront.css';

import React from 'react';
import { AuthProvider } from '@/core/contexts/AuthContext';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Fraunces, Manrope } from 'next/font/google';
import ServiceWorkerRegistration from '@/components/common/ServiceWorkerRegistration';
import AccessibilityStyles from '@/components/common/AccessibilityStyles';
import SkipLink from '@/components/common/SkipLink';
import { Metadata, Viewport } from 'next';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AnalyticsTracker from '@/components/common/AnalyticsTracker';
import { Suspense } from 'react';

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lojinha-do-ze.vercel.app';

export const metadata: Metadata = {
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lojinha do Zé',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

function A11yAnnouncer() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute' as const,
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      id="a11y-announcer"
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${manrope.variable}`}>
      <head>
        {/* Preload de recursos críticos */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Meta tags para PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lojinha do Zé" />
        
        {/* Ícones para PWA */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        
        {/* Meta tags para acessibilidade */}
        <meta name="theme-color" content="#667eea" />
        <meta name="color-scheme" content="light" />
      </head>
      <body>
        <ToastProvider>
          <ErrorBoundary>
            <ConfirmDialogProvider>
              <AuthProvider>
                <ServiceWorkerRegistration />
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                <A11yAnnouncer />
                <SkipLink />
                <main id="main-content">
                  {children}
                </main>
              </AuthProvider>
            </ConfirmDialogProvider>
          </ErrorBoundary>
        </ToastProvider>
        
        <AccessibilityStyles />
      </body>
    </html>
  );
}

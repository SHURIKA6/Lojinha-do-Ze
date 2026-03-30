import './globals.css';
import './experience.css';
import './storefront.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Fraunces, Manrope } from 'next/font/google';
import { useEffect } from 'react';

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

import ErrorBoundary from '@/components/common/ErrorBoundary';

function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
            
            // Verifica atualizações do Service Worker
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  if (confirm('Nova versão disponível! Deseja atualizar?')) {
                    window.location.reload();
                  }
                }
              });
            });
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return null;
}

function A11yAnnouncer() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      id="a11y-announcer"
    />
  );
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: '#667eea',
        color: 'white',
        padding: '8px',
        textDecoration: 'none',
        borderRadius: '4px',
        zIndex: 10000,
        transition: 'top 0.3s',
      }}
      onFocus={(e) => {
        e.target.style.top = '6px';
      }}
      onBlur={(e) => {
        e.target.style.top = '-40px';
      }}
    >
      Pular para o conteúdo principal
    </a>
  );
}

export default function RootLayout({ children }) {
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
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <ErrorBoundary>
          <ToastProvider>
            <ConfirmDialogProvider>
              <AuthProvider>
                <ServiceWorkerRegistration />
                <A11yAnnouncer />
                <SkipLink />
                <main id="main-content">
                  {children}
                </main>
              </AuthProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </ErrorBoundary>
        
        {/* Estilos inline para acessibilidade */}
        <style jsx>{`
          .skip-link:focus {
            top: 6px !important;
          }
          
          /* Melhora o foco para acessibilidade */
          :focus-visible {
            outline: 3px solid #667eea;
            outline-offset: 2px;
          }
          
          /* Suporte a alto contraste */
          @media (prefers-contrast: high) {
            :root {
              --primary-500: #0000ff;
              --danger-500: #ff0000;
              --success-500: #00ff00;
            }
          }
          
          /* Reduz animações para usuários que preferem */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
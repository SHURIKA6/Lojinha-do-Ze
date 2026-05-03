/**
 * Página Inicial (Home)
 * 
 * Landing page da Lojinha do Zé.
 */

import StorefrontPageClient from '@/features/storefront/StorefrontPageClient';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lojinha-do-ze.vercel.app';

export const metadata: Metadata = {
  title: 'Loja',
  description:
    'Compre produtos fitoterápicos e naturais com entrega local ou retirada no balcão.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Loja | Lojinha do Zé',
    description:
      'Catálogo organizado com checkout simples, entrega local e atendimento direto.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loja | Lojinha do Zé',
    description:
      'Catálogo organizado com checkout simples, entrega local e atendimento direto.',
  },
};

async function getRequestOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://lojinha-do-ze.vercel.app';
  }

  const incoming = await headers();
  const host = incoming.get('x-forwarded-host') || incoming.get('host');
  if (!host) {
    return 'http://localhost:3000';
  }

  const proto = incoming.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

async function loadInitialCatalog(): Promise<any> {
  const origin = await getRequestOrigin();

  try {
    const res = await fetch(`${origin}/api/catalog`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialCatalog = await loadInitialCatalog();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Loja - Lojinha do Zé',
    url: siteUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Lojinha do Zé',
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StorefrontPageClient initialCatalog={initialCatalog} />
    </>
  );
}

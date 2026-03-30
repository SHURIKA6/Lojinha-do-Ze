import StorefrontPageClient from '@/features/storefront/StorefrontPageClient';
import { headers } from 'next/headers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lojinha-do-ze.vercel.app';

export const metadata = {
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

function getRequestOrigin() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // SEC: Em produção, não confiar em headers da requisição (host header poisoning)
  // NEXT_PUBLIC_SITE_URL deve ser configurado obrigatoriamente
  if (process.env.NODE_ENV === 'production') {
    return 'https://lojinha-do-ze.vercel.app';
  }

  // Apenas em desenvolvimento, usar headers da requisição
  const incoming = headers();
  const host = incoming.get('x-forwarded-host') || incoming.get('host');
  if (!host) {
    return 'http://localhost:3000';
  }

  const proto = incoming.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

async function loadInitialCatalog() {
  const origin = getRequestOrigin();

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

import StorefrontPageClient from '@/features/storefront/StorefrontPageClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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

export default function HomePage() {
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
      <StorefrontPageClient />
    </>
  );
}

import StorefrontPageClient from '@/features/storefront/StorefrontPageClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Loja | Lojinha do Zé',
  description:
    'Compre produtos fitoterápicos e naturais com entrega local ou retirada no balcão.',
  alternates: {
    canonical: '/loja',
  },
  openGraph: {
    title: 'Loja | Lojinha do Zé',
    description:
      'Catálogo organizado com checkout simples, entrega local e atendimento direto.',
    url: '/loja',
    type: 'website',
  },
};

export default function LojaPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Loja - Lojinha do Zé',
    url: `${siteUrl}/loja`,
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

import HomePageClient from '@/features/marketing/HomePageClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  title: 'Lojinha do Zé | Produtos naturais e fitoterápicos',
  description:
    'Loja online de produtos fitoterápicos e naturais com catálogo organizado, entrega local e atendimento direto.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lojinha do Zé',
    description:
      'Produtos naturais com experiência de compra mais clara, segura e profissional.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lojinha do Zé',
    description:
      'Produtos naturais com experiência de compra mais clara, segura e profissional.',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Lojinha do Zé',
    url: siteUrl,
    description:
      'Loja de produtos fitoterápicos e naturais com compra online, retirada e entrega local.',
    areaServed: 'Brasil',
    availableLanguage: 'pt-BR',
    brand: {
      '@type': 'Organization',
      name: 'Lojinha do Zé',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}

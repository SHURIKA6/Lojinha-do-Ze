const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/loja'],
        disallow: ['/login', '/ativar-conta', '/admin', '/cliente'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

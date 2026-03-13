const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/login', '/ativar-conta', '/admin', '/conta', '/cliente'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

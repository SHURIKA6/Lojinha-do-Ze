/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // SEC-07: X-XSS-Protection removido — deprecated e pode causar vulnerabilidades em browsers antigos.
          // CSP é o substituto correto.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // TODO SEC-05: Migrar para nonces quando Next.js tiver suporte melhor.
            // Por enquanto, 'unsafe-inline' é necessário para o funcionamento do Next.js.
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai; frame-ancestors 'none';",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const proxyBase = process.env.API_PROXY_BASE || process.env.NEXT_PUBLIC_API_PROXY_BASE || 'http://localhost:8787/api';
    const destination = proxyBase.endsWith('/') ? `${proxyBase}:path*` : `${proxyBase}/:path*`;
    
    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;

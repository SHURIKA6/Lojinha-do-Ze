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
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none';",
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

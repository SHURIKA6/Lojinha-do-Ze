/** @type {import('next').NextConfig} */
const nextConfig = {
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

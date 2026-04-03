/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  
  // PWA Configuration
  experimental: {
    webpackBuildWorker: true,
  },
  
  // Turbopack config (Next.js 16 compatibility)
  turbopack: {},
  
  // Headers de segurança
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "connect-src 'self' https:",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      "frame-ancestors 'none'",
    ].join('; ');
    
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Rewrites para API proxy
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
  
  // Compressão
  compress: true,
  
  // Otimizações de imagem
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack config para otimizações
  webpack: (config, { dev, isServer }) => {
    // Otimizações para produção
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
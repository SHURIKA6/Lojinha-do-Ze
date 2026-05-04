/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    const isProd = process.env.NODE_ENV === 'production';
    
    // Define domínios confiáveis para conexões e imagens
    const backendUrl = process.env.BACKEND_URL || '';
    const trustedDomains = [
      "'self'",
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://r2cdn.perplexity.ai',
    ];
    
    // Adiciona o domínio do backend se configurado
    if (backendUrl) {
      try {
        const url = new URL(backendUrl);
        trustedDomains.push(url.origin);
      } catch {
        // Ignora se a URL for inválida
      }
    }
    
    // Em desenvolvimento, permite localhost para conexões
    if (isDev) {
      trustedDomains.push('http://localhost:*', 'https://localhost:*');
    }
    
    const connectSrc = isProd
      ? trustedDomains.join(' ')
      : [...trustedDomains, 'https:'].join(' '); // Em dev, permite https: para flexibilidade
    
    const cspDirectives = [
      "default-src 'self'",
      // Remove unsafe-eval em produção; em dev mantém unsafe-eval para hot reload se necessário
      // Adiciona unsafe-inline para permitir os scripts inline injetados pelo Next.js
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      `connect-src ${connectSrc}`,
      `img-src 'self' data: ${trustedDomains.filter(d => !d.includes('fonts')).join(' ')}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline necessário para styled-jsx do Next.js
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
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
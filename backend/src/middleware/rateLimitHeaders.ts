/**
 * Middleware para adicionar headers de rate limit nas respostas
 * Fornece informações sobre limites de taxa para clientes
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * Adiciona headers de rate limit nas respostas
 */
export function addRateLimitHeaders() {
  return async (c: Context, next: Next) => {
    // Adiciona headers antes da requisição
    const startTime = Date.now();
    
    await next();
    
    // Adiciona headers após a requisição
    const duration = Date.now() - startTime;
    
    // Headers de rate limit genéricos
    c.res.headers.set('X-RateLimit-Limit', '60');
    c.res.headers.set('X-RateLimit-Remaining', '59'); // Placeholder - seria calculado dinamicamente
    c.res.headers.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + 60).toString());
    
    // Headers de performance
    c.res.headers.set('X-Response-Time', `${duration}ms`);
    
    // Headers de segurança adicionais
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Log de performance para requisições lentas
    if (duration > 1000) {
      logger.warn('Requisição lenta detectada', {
        path: c.req.path,
        method: c.req.method,
        duration: `${duration}ms`,
        ip: c.req.header('cf-connecting-ip') || '127.0.0.1'
      });
    }
  };
}

/**
 * Middleware para rate limit dinâmico baseado no endpoint
 */
export function dynamicRateLimitHeaders(operationType: string) {
  return async (c: Context, next: Next) => {
    const limits = getRateLimitsForOperation(operationType);
    
    await next();
    
    // Adiciona headers específicos para a operação
    c.res.headers.set('X-RateLimit-Limit', limits.max.toString());
    c.res.headers.set('X-RateLimit-Remaining', Math.max(0, limits.max - 1).toString());
    c.res.headers.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + limits.window).toString());
    c.res.headers.set('X-RateLimit-Policy', `${limits.max};w=${limits.window}`);
  };
}

/**
 * Retorna os limites de rate para cada tipo de operação
 */
function getRateLimitsForOperation(operationType: string): { max: number; window: number } {
  const limits: Record<string, { max: number; window: number }> = {
    // Autenticação
    'auth_login': { max: 5, window: 900 }, // 5 por 15 minutos
    'auth_register': { max: 3, window: 3600 }, // 3 por hora
    'auth_password_reset': { max: 3, window: 3600 }, // 3 por hora
    
    // Pedidos
    'order_create': { max: 10, window: 3600 }, // 10 por hora
    'order_update': { max: 20, window: 3600 }, // 20 por hora
    'order_cancel': { max: 5, window: 3600 }, // 5 por hora
    
    // Catálogo
    'catalog_read': { max: 100, window: 60 }, // 100 por minuto
    'catalog_write': { max: 10, window: 3600 }, // 10 por hora
    
    // Uploads
    'upload_general': { max: 20, window: 3600 }, // 20 por hora
    'upload_image': { max: 10, window: 3600 }, // 10 por hora
    
    // Admin
    'admin_read': { max: 200, window: 60 }, // 200 por minuto
    'admin_write': { max: 50, window: 3600 }, // 50 por hora
    
    // Webhooks
    'webhook_payment': { max: 100, window: 60 }, // 100 por minuto
    'webhook_notification': { max: 100, window: 60 }, // 100 por minuto
  };

  return limits[operationType] || { max: 60, window: 60 }; // Padrão: 60 por minuto
}

/**
 * Middleware para logar uso de rate limit
 */
export function rateLimitUsageLogger(operationType: string) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    await next();
    
    // Log de uso de rate limit
    const remaining = c.res.headers.get('X-RateLimit-Remaining');
    const limit = c.res.headers.get('X-RateLimit-Limit');
    
    if (remaining && limit && parseInt(remaining) < parseInt(limit) * 0.1) {
      logger.warn('Rate limit próximo do limite', {
        operationType,
        ip,
        userAgent,
        path: c.req.path,
        method: c.req.method,
        remaining,
        limit
      });
    }
  };
}

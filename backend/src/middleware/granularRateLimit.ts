/**
 * Rate limiting mais granular por endpoint
 * Diferentes limites para diferentes tipos de operação
 */

import { Context, Next } from 'hono';
import { createRateLimiter } from './rateLimit.js';
import { logger } from '../utils/logger.js';

// Rate limiters específicos por endpoint
export const authLimiter = createRateLimiter('auth', 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
export const loginLimiter = createRateLimiter('login', 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
export const registerLimiter = createRateLimiter('register', 3, 60 * 60 * 1000); // 3 registros por hora
export const passwordResetLimiter = createRateLimiter('password_reset', 3, 60 * 60 * 1000); // 3 resets por hora

// Rate limiters para operações de dados
export const createOrderLimiter = createRateLimiter('create_order', 10, 60 * 60 * 1000); // 10 pedidos por hora
export const updateOrderLimiter = createRateLimiter('update_order', 20, 60 * 60 * 1000); // 20 atualizações por hora
export const cancelOrderLimiter = createRateLimiter('cancel_order', 5, 60 * 60 * 1000); // 5 cancelamentos por hora

// Rate limiters para operações de catálogo
export const catalogReadLimiter = createRateLimiter('catalog_read', 100, 60 * 1000); // 100 leituras por minuto
export const catalogWriteLimiter = createRateLimiter('catalog_write', 10, 60 * 60 * 1000); // 10 escritas por hora

// Rate limiters para uploads
export const uploadLimiter = createRateLimiter('upload', 20, 60 * 60 * 1000); // 20 uploads por hora
export const imageUploadLimiter = createRateLimiter('image_upload', 10, 60 * 60 * 1000); // 10 uploads de imagem por hora

// Rate limiters para APIs administrativas
export const adminApiLimiter = createRateLimiter('admin_api', 200, 60 * 1000); // 200 requisições por minuto
export const adminWriteLimiter = createRateLimiter('admin_write', 50, 60 * 60 * 1000); // 50 escritas por hora

// Rate limiters para webhooks
export const webhookLimiter = createRateLimiter('webhook', 100, 60 * 1000); // 100 webhooks por minuto

type OperationType = 
  | 'auth_login'
  | 'auth_register'
  | 'auth_password_reset'
  | 'auth_refresh'
  | 'order_create'
  | 'order_update'
  | 'order_cancel'
  | 'catalog_read'
  | 'catalog_write'
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'upload_general'
  | 'upload_image'
  | 'admin_read'
  | 'admin_write'
  | 'webhook_payment'
  | 'webhook_notification';

type RateLimiter = (c: Context, next: Next) => Promise<Response | void>;

/**
 * Middleware para aplicar rate limiting baseado no tipo de operação
 */
export function applyGranularRateLimit(operationType: OperationType) {
  return async (c: Context, next: Next) => {
    const limiter = getRateLimiterForOperation(operationType);

    if (!limiter) {
      // Se não houver limiter específico, usar o padrão
      return await next();
    }

    // Aplica o rate limiter específico
    return await limiter(c, next);
  };
}

/**
 * Retorna o rate limiter apropriado para o tipo de operação
 */
function getRateLimiterForOperation(operationType: OperationType): RateLimiter | null {
  const limiters: Record<OperationType, RateLimiter> = {
    // Autenticação
    'auth_login': loginLimiter,
    'auth_register': registerLimiter,
    'auth_password_reset': passwordResetLimiter,
    'auth_refresh': authLimiter,
    
    // Pedidos
    'order_create': createOrderLimiter,
    'order_update': updateOrderLimiter,
    'order_cancel': cancelOrderLimiter,
    
    // Catálogo
    'catalog_read': catalogReadLimiter,
    'catalog_write': catalogWriteLimiter,
    'product_create': catalogWriteLimiter,
    'product_update': catalogWriteLimiter,
    'product_delete': catalogWriteLimiter,
    
    // Uploads
    'upload_general': uploadLimiter,
    'upload_image': imageUploadLimiter,
    
    // Admin
    'admin_read': adminApiLimiter,
    'admin_write': adminWriteLimiter,
    
    // Webhooks
    'webhook_payment': webhookLimiter,
    'webhook_notification': webhookLimiter,
  };

  return limiters[operationType] || null;
}

/**
 * Middleware para detectar e logar tentativas de abuso
 */
export function abuseDetectionMiddleware(operationType: OperationType) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    // Log de tentativas de acesso
    logger.info('Rate limit check', {
      operationType,
      ip,
      userAgent,
      path: c.req.path,
      method: c.req.method
    });

    return await next();

    // Se a resposta for 429 (rate limit), log como possível abuso
    if (c.res.status === 429) {
      logger.warn('Rate limit exceeded - possible abuse', {
        operationType,
        ip,
        userAgent,
        path: c.req.path,
        method: c.req.method,
        statusCode: c.res.status
      });
    }
  };
}

/**
 * Middleware combinado que aplica rate limiting e detecção de abuso
 */
export function rateLimitWithAbuseDetection(operationType: OperationType) {
  return [
    abuseDetectionMiddleware(operationType),
    applyGranularRateLimit(operationType)
  ];
}
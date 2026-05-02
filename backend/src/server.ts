import { Hono, Next } from 'hono';
import { createDb } from './core/db';
import { createCorsMiddleware, originGuardMiddleware, securityHeadersMiddleware } from './core/middleware/security';
import { isSafeMethod, jsonError } from './core/utils/http';
import { logger } from './core/utils/logger';
import { cacheService } from './modules/system/cacheService';
import authRoutes from './modules/auth/routes';
import catalogRoutes from './modules/products/catalogRoutes';
import customersRoutes from './modules/customers/routes';
import dashboardRoutes from './modules/analytics/dashboardRoutes';
import ordersRoutes from './modules/orders/routes';
import productsRoutes from './modules/products/routes';
import profileRoutes from './modules/customers/profileRoutes';
import reportsRoutes from './modules/analytics/reportsRoutes';
import transactionsRoutes from './modules/payments/transactionsRoutes';
import uploadRoutes from './modules/system/uploadRoutes';
import paymentRoutes from './modules/payments/routes';
import aiRoutes from './modules/system/aiRoutes';
import analyticsRoutes from './modules/analytics/routes';
import shippingRoutes from './modules/shipping/routes';
import reviewRoutes from './modules/products/reviewRoutes';
import { handleScheduledTasks } from './modules/system/cron';
import { logSystemEvent } from './modules/system/logService';
import deliveryRoutes from './modules/delivery/routes';

import { apiLimiter } from './core/middleware/rateLimit';
import { auditMiddleware } from './core/middleware/audit';
import { csrfMiddleware, optionalAuthMiddleware } from './core/middleware/auth';
import { timeout } from 'hono/timeout';
import { Bindings, Variables, Database } from './core/types';

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();
const DBLESS_PATH_PREFIXES = ['/api/health', '/api/notifications/ws', '/api/notifications/broadcast', '/api/delivery'];
const DBLESS_SAFE_PREFIXES = ['/api/upload/products/'];

// Timeout global de 15 segundos para evitar 504 Gateway Timeout do Cloudflare/Vercel
app.use('/api/*', timeout(15000));
app.use('/api/*', apiLimiter);
app.use('/api/*', createCorsMiddleware());
app.use('/api/*', securityHeadersMiddleware);
app.use('/api/*', originGuardMiddleware);
// auditMiddleware movido para depois do dbMiddleware para ter acesso ao c.get('db') e c.get('user')

app.get('/api/health', async (c) => {
  const isProduction = c.env?.ENVIRONMENT === 'production';

  const health: any = {
    status: 'ok',
    message: 'Lojinha do Zé API',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    const connectionString = c.env?.DATABASE_URL;
    if (connectionString) {
      const db = createDb(connectionString);
      await db.query('SELECT 1');
      health.checks.database = { status: 'ok' };
    } else {
      health.status = 'degraded';
      health.checks.database = { status: 'missing_config' };
    }
  } catch (error: any) {
    health.status = 'degraded';
    logger.error('Health check: falha na conexão com o banco', error as Error);
    health.checks.database = { 
      status: 'error',
      message: error.message
    };
  }

  health.checks.cache = cacheService.getMetrics();

  const statusCode = health.status === 'ok' ? 200 : 503;
  return c.json(health, statusCode as any);
});

app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (DBLESS_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return await next();
  }

  if (isSafeMethod(c.req.method) && DBLESS_SAFE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return await next();
  }

  const connectionString = c.env?.DATABASE_URL;
  if (!connectionString) {
    logger.error('CRITICAL: DATABASE_URL is not configured for this request.');
    return jsonError(c, 500, 'Erro interno no servidor');
  }

  const db = createDb(connectionString);
  c.set('db', db);

  try {
    return await optionalAuthMiddleware(c, (async () => {
      return await csrfMiddleware(c, next);
    }) as Next);
  } catch (error) {
    logger.error('Erro na Requisição API', error as Error);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    const db = c.get('db');
    if (db) {
      await db.close().catch((error: any) => {
        logger.warn('DB close error', { error: error?.message });
      });
    }
  }
});

// Middleware de auditoria deve rodar DEPOIS do DB para ter acesso ao banco e usuário,
// mas ANTES de fechar a conexão no finally do middleware acima? 
// Não, o middleware acima ENVELOPA o próximo. Então auditMiddleware rodará "dentro" do try/finally.
app.use('/api/*', auditMiddleware);

app.onError((error, c) => {
  const errorId = crypto.randomUUID().split('-')[0];
  const db = c.get('db');
  const user = c.get('user') as any;

  logger.error("Unhandled Global Error []", error, {
    path: c.req.path,
    method: c.req.method,
    userId: user?.id,
  });

  // Persiste o erro no banco e alerta via WhatsApp se possível
  if (db) {
    const logPromise = logSystemEvent(
      db,
      c.env,
      'error',
      "Erro Global []",
      {
        path: c.req.path,
        method: c.req.method,
        userId: user?.id,
        requestId: errorId
      },
      error as Error,
      c.executionCtx
    );

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(logPromise);
    }
  }

  return jsonError(c, 500, 'Erro interno no servidor', { errorId });
});

import notificationRoutes from './modules/notifications/routes';
import webhookRoutes from './modules/notifications/webhookRoutes';
import { NotificationDO } from './modules/notifications/durableObject';
import { DeliveryLocationDO } from './modules/delivery/locationDO';

app.route('/api/auth', authRoutes as any);
app.route('/api/catalog', catalogRoutes as any);
app.route('/api/customers', customersRoutes as any);
app.route('/api/dashboard', dashboardRoutes as any);
app.route('/api/orders', ordersRoutes as any);
app.route('/api/products', productsRoutes as any);
app.route('/api/profile', profileRoutes as any);
app.route('/api/reports', reportsRoutes as any);
app.route('/api/transactions', transactionsRoutes as any);
app.route('/api/upload', uploadRoutes as any);
app.route('/api/payments', paymentRoutes as any);
app.post('/api/webhooks/mercadopago', async (c) => {
  return await paymentRoutes.fetch(c.req.raw, c.env, c.executionCtx);
});
app.route('/api/ai', aiRoutes as any);
app.route('/api/admin', aiRoutes as any);
app.route('/api/analytics', analyticsRoutes as any);
app.route('/api/shipping', shippingRoutes as any);
app.route('/api/reviews', reviewRoutes as any);
app.route('/api/notifications', notificationRoutes as any);
app.route('/api/delivery', deliveryRoutes as any);
app.route('/api/webhooks/whatsapp', webhookRoutes as any);

export { app, NotificationDO, DeliveryLocationDO };

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    ctx.waitUntil(handleScheduledTasks(env));
  },
};

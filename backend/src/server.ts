import { Hono, Next } from 'hono';
import { createDb } from './core/db';
import { createCorsMiddleware, originGuardMiddleware, securityHeadersMiddleware } from './middleware/security';
import { isSafeMethod, jsonError } from './utils/http';
import { logger } from './utils/logger';
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

import { apiLimiter } from './middleware/rateLimit';
import { auditMiddleware } from './middleware/audit';
import { csrfMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { Bindings, Variables, Database } from './types';

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();
const DBLESS_PATH_PREFIXES = ['/api/health'];
const DBLESS_SAFE_PREFIXES = ['/api/upload/products/'];

app.use('/api/*', apiLimiter);
app.use('/api/*', createCorsMiddleware());
app.use('/api/*', securityHeadersMiddleware);
app.use('/api/*', originGuardMiddleware);
app.use('/api/*', auditMiddleware);

app.get('/api/health', async (c) => {
  const isProduction = c.env?.ENVIRONMENT === 'production';

  const health: any = {
    status: 'ok',
    message: 'Lojinha do Zé API',
    timestamp: new Date().toISOString(),
  };

  if (!isProduction) {
    health.checks = {};
  }

  const connectionString = c.env?.DATABASE_URL;
  if (connectionString) {
    try {
      const db = createDb(connectionString);
      await db.query('SELECT 1');
      if (!isProduction) {
        health.checks.database = { status: 'ok' };
      }
      await db.close();
    } catch (error) {
      health.status = 'degraded';
      logger.error('Health check: falha na conexão com o banco', error as Error);
      if (!isProduction) {
        health.checks.database = { status: 'error' };
      }
    }
  } else if (!isProduction) {
    health.checks.database = { status: 'not_configured' };
  }

  if (!isProduction) {
    health.checks.cache = cacheService.getMetrics();
  }

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
    const closePromise = db.close().catch((error) => {
      logger.warn('DB close error', { error: error?.message });
    });

    if ((c as any).executionCtx?.waitUntil) {
      (c as any).executionCtx.waitUntil(closePromise);
    } else {
      await closePromise;
    }
  }
});

app.onError((error, c) => {
  logger.error('Unhandled Global Error', error, {
    path: c.req.path,
    method: c.req.method,
    user: (c.get('user') as any)?.id,
  });
  return jsonError(c, 500, 'Erro interno no servidor');
});

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
app.route('/api/admin', aiRoutes as any);
app.route('/api/analytics', analyticsRoutes as any);

export default app;
